"""
app/services/payments.py — payment business logic + dual-write.

Authoritative status lives in bluetech-db (orders / bookings).
Every attempt is also recorded in payments-db for history/audit.

Flow per payment:
  initiate -> gateway.initialize_transaction, store reference in bluetech-db,
              insert a 'pending' row in payments-db.
  verify   -> gateway.verify_transaction; on success update bluetech-db and
              upsert the payments-db row to 'paid'.
  webhook  -> same apply path as verify (idempotent).
"""
import json
import logging
import uuid

from app import db
from app.config import settings
from app.gateways import get_gateway
from app.services.audit import log_action

logger = logging.getLogger(__name__)

KINDS = ("order", "commitment", "final")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_reference(prefix: str, entity_id: str) -> str:
    short = str(entity_id)[:8].upper()
    rand = uuid.uuid4().hex[:6].upper()
    return f"{prefix}-{short}-{rand}"


def _callback_url(override: str | None) -> str | None:
    if override:
        return override
    base = (settings.FRONTEND_URL or "").rstrip("/")
    return f"{base}/payment/callback" if base else None


def _txn_row(reference: str) -> dict | None:
    try:
        return db.fetch_one(
            "payments",
            "SELECT * FROM payments_transaction WHERE gateway_ref = %s",
            (reference,),
        )
    except Exception as exc:  # pragma: no cover - payments-db may be down
        logger.warning("Could not read payments transaction %s: %s", reference, exc)
        return None


def _gateway_for_reference(reference: str):
    row = _txn_row(reference)
    name = row.get("gateway") if row else None
    return get_gateway(name)


def _resolve_kind(reference: str, meta: dict | None = None) -> tuple[str | None, str | None]:
    """Work out which entity a reference belongs to."""
    row = _txn_row(reference)
    if row and row.get("kind"):
        return row["kind"], row.get("entity_id")

    if reference.startswith("ORD-"):
        return "order", (meta or {}).get("order_id")
    if reference.startswith("CMT-"):
        return "commitment", (meta or {}).get("booking_id")
    if reference.startswith("FNL-"):
        return "final", (meta or {}).get("booking_id")

    meta = meta or {}
    kind = meta.get("type")
    if kind in KINDS:
        entity_id = meta.get("order_id") or meta.get("booking_id")
        return kind, entity_id
    return None, None


def _record_initiation(
    *,
    gateway: str,
    reference: str,
    kind: str,
    entity_id: str,
    amount_kes: float,
    phone: str | None,
    metadata: dict | None,
    external_ref: str | None = None,
) -> None:
    try:
        db.execute(
            "payments",
            """INSERT INTO payments_transaction
                 (gateway, gateway_ref, external_ref, kind, entity_id, amount_kes, status,
                  currency, phone, raw, created_at, updated_at)
               VALUES (%s, %s, %s, %s, %s, %s, 'pending', 'KES', %s, %s::jsonb, NOW(), NOW())
               ON CONFLICT (gateway_ref) DO NOTHING""",
            (
                gateway,
                reference,
                external_ref,
                kind,
                str(entity_id),
                amount_kes,
                phone,
                json.dumps(metadata or {}),
            ),
        )
    except Exception as exc:  # pragma: no cover - non-fatal
        logger.warning("Could not record initiation for %s: %s", reference, exc)


def _record_result(reference: str, result: dict, kind: str | None = None,
                   entity_id: str | None = None) -> None:
    try:
        db.execute(
            "payments",
            """INSERT INTO payments_transaction
                 (gateway, gateway_ref, kind, entity_id, amount_kes, status,
                  currency, raw, created_at, updated_at)
               VALUES (%s, %s, %s, %s, %s, %s, 'KES', %s::jsonb, NOW(), NOW())
               ON CONFLICT (gateway_ref) DO UPDATE SET
                 status     = EXCLUDED.status,
                 amount_kes = COALESCE(EXCLUDED.amount_kes, payments_transaction.amount_kes),
                 raw        = EXCLUDED.raw,
                 updated_at = NOW()""",
            (
                result.get("gateway"),
                reference,
                kind,
                str(entity_id) if entity_id else None,
                result.get("amount_kes"),
                result.get("status"),
                json.dumps(result.get("raw") or {}),
            ),
        )
    except Exception as exc:  # pragma: no cover - non-fatal
        logger.warning("Could not record result for %s: %s", reference, exc)


def _apply_paid(kind: str, reference: str, receipt: str, result: dict) -> int:
    """Authoritative write to bluetech-db, then mirror to payments-db."""
    if kind == "order":
        affected = db.execute(
            "bluetech",
            """UPDATE orders
                  SET payment_status = 'paid',
                      payment_receipt = %s
                WHERE payment_reference = %s""",
            (receipt, reference),
        )
    elif kind == "commitment":
        affected = db.execute(
            "bluetech",
            """UPDATE bookings
                  SET commitment_payment_status = 'paid',
                      commitment_receipt = %s
                WHERE commitment_payment_reference = %s""",
            (receipt, reference),
        )
    elif kind == "final":
        affected = db.execute(
            "bluetech",
            """UPDATE bookings
                  SET final_payment_status = 'paid',
                      final_receipt = %s,
                      status = CASE WHEN status = 'ready'
                                    THEN 'completed'::booking_status
                                    ELSE status END
                WHERE final_payment_reference = %s""",
            (receipt, reference),
        )
    else:
        raise ValueError(f"Unknown payment kind '{kind}'")

    _record_result(reference, result, kind=kind)
    logger.info("Applied %s payment for %s (rows=%s)", kind, reference, affected)
    return affected


# ── Order payments ────────────────────────────────────────────────────────────

def initiate_order_payment(order_id: str, opts) -> dict:
    order = db.fetch_one("bluetech", "SELECT * FROM orders WHERE id = %s", (order_id,))
    if not order:
        raise ValueError("Order not found")
    if order.get("payment_status") == "paid":
        raise ValueError("Order already paid")

    email = order.get("email") or f"{order['phone_number']}@noemail.bluetech.co.ke"
    amount = float(order["total_amount"])
    reference = _make_reference("ORD", order_id)
    gateway = get_gateway(getattr(opts, "gateway", None))

    result = gateway.initialize_transaction(
        email=email,
        amount_kes=amount,
        reference=reference,
        callback_url=_callback_url(getattr(opts, "callback_url", None)),
        phone_number=order["phone_number"],
        metadata={
            "order_id": order_id,
            "type": "order",
            "phone": order["phone_number"],
            **(getattr(opts, "metadata", None) or {}),
        },
    )

    payhero_ref = result.get("reference") or reference

    db.execute(
        "bluetech",
        "UPDATE orders SET payment_reference = %s WHERE id = %s",
        (payhero_ref, order_id),
    )
    _record_initiation(
        gateway=gateway.name,
        reference=payhero_ref,
        kind="order",
        entity_id=order_id,
        amount_kes=amount,
        phone=order["phone_number"],
        metadata={"order_id": order_id},
        external_ref=reference,
    )
    log_action("order.initiate", entity_type="order", entity_id=order_id,
               detail={"reference": payhero_ref, "external_reference": reference,
                       "gateway": gateway.name, "amount": amount})

    return {
        "authorization_url": result.get("authorization_url"),
        "reference": payhero_ref,
        "external_reference": reference,
        "gateway": gateway.name,
        "requires_stk": result.get("requires_stk", False),
        "amount_kes": amount,
        "message": (
            "Redirect customer to authorization_url to complete payment."
            if result.get("authorization_url")
            else "Ask the customer to approve the STK prompt on their phone."
        ),
    }


def get_order_payment_status(order_id: str) -> dict:
    row = db.fetch_one(
        "bluetech",
        "SELECT payment_status, payment_receipt, payment_reference FROM orders WHERE id = %s",
        (order_id,),
    )
    if not row:
        raise ValueError("Order not found")
    return row


# ── Booking commitment payment ────────────────────────────────────────────────

def initiate_commitment_payment(booking_id: str, opts) -> dict:
    booking = db.fetch_one("bluetech", "SELECT * FROM bookings WHERE id = %s", (booking_id,))
    if not booking:
        raise ValueError("Booking not found")
    if booking.get("commitment_payment_status") == "paid":
        raise ValueError("Commitment fee already paid")

    service_price = int(getattr(opts, "service_price", 0) or 0)
    price = service_price or int(booking.get("estimated_cost") or booking.get("final_cost") or 0)
    if price <= 0:
        raise ValueError("No service cost provided")

    commitment_amount = max(1, round(price * 0.20))

    if not booking.get("estimated_cost") and service_price > 0:
        db.execute(
            "bluetech",
            "UPDATE bookings SET estimated_cost = %s WHERE id = %s",
            (float(service_price), booking_id),
        )

    reference = _make_reference("CMT", booking_id)
    gateway = get_gateway(getattr(opts, "gateway", None))
    phone = booking["phone_number"]
    email = f"{phone}@noemail.bluetech.co.ke"

    result = gateway.initialize_transaction(
        email=email,
        amount_kes=float(commitment_amount),
        reference=reference,
        callback_url=_callback_url(getattr(opts, "callback_url", None)),
        phone_number=phone,
        metadata={
            "booking_id": booking_id,
            "type": "commitment",
            "phone": phone,
            **(getattr(opts, "metadata", None) or {}),
        },
    )

    payhero_ref = result.get("reference") or reference

    db.execute(
        "bluetech",
        """UPDATE bookings
              SET commitment_fee = %s,
                  commitment_payment_reference = %s
            WHERE id = %s""",
        (commitment_amount, payhero_ref, booking_id),
    )
    _record_initiation(
        gateway=gateway.name,
        reference=payhero_ref,
        kind="commitment",
        entity_id=booking_id,
        amount_kes=float(commitment_amount),
        phone=phone,
        metadata={"booking_id": booking_id},
        external_ref=reference,
    )
    log_action("commitment.initiate", entity_type="booking", entity_id=booking_id,
               detail={"reference": payhero_ref, "external_reference": reference,
                       "gateway": gateway.name, "amount": commitment_amount})

    return {
        "authorization_url": result.get("authorization_url"),
        "reference": payhero_ref,
        "external_reference": reference,
        "gateway": gateway.name,
        "requires_stk": result.get("requires_stk", False),
        "amount_kes": float(commitment_amount),
        "message": (
            "Redirect customer to authorization_url to pay the commitment fee."
            if result.get("authorization_url")
            else f"Ask the customer to approve the KES {float(commitment_amount)} STK prompt."
        ),
    }


def get_commitment_status(booking_id: str) -> dict:
    row = db.fetch_one(
        "bluetech",
        """SELECT commitment_payment_status, commitment_receipt, commitment_fee,
                  commitment_payment_reference
             FROM bookings WHERE id = %s""",
        (booking_id,),
    )
    if not row:
        raise ValueError("Booking not found")
    return row


# ── Booking final payment ─────────────────────────────────────────────────────

def request_final_payment(booking_id: str, opts) -> dict:
    booking = db.fetch_one("bluetech", "SELECT * FROM bookings WHERE id = %s", (booking_id,))
    if not booking:
        raise ValueError("Booking not found")
    if booking.get("status") != "ready":
        raise ValueError(
            f"Booking must be in 'ready' state before payment (current: {booking.get('status')})."
        )
    if booking.get("final_payment_status") == "paid":
        raise ValueError("Final payment already received")

    service_total = int(booking.get("final_cost") or booking.get("estimated_cost") or 0)
    if service_total <= 0:
        raise ValueError("Set a final cost before requesting payment")

    pickup = int(booking.get("pickup_fee") or 0)
    total = service_total + pickup
    commitment = int(booking.get("commitment_fee") or 0)
    remaining = max(1, total - commitment)

    reference = _make_reference("FNL", booking_id)
    gateway = get_gateway(getattr(opts, "gateway", None))
    phone = booking["phone_number"]
    email = f"{phone}@noemail.bluetech.co.ke"

    result = gateway.initialize_transaction(
        email=email,
        amount_kes=float(remaining),
        reference=reference,
        callback_url=_callback_url(getattr(opts, "callback_url", None)),
        phone_number=phone,
        metadata={
            "booking_id": booking_id,
            "type": "final",
            "phone": phone,
            **(getattr(opts, "metadata", None) or {}),
        },
    )

    payhero_ref = result.get("reference") or reference

    db.execute(
        "bluetech",
        "UPDATE bookings SET final_payment_reference = %s WHERE id = %s",
        (payhero_ref, booking_id),
    )
    _record_initiation(
        gateway=gateway.name,
        reference=payhero_ref,
        kind="final",
        entity_id=booking_id,
        amount_kes=float(remaining),
        phone=phone,
        metadata={"booking_id": booking_id},
        external_ref=reference,
    )
    log_action("final.request", entity_type="booking", entity_id=booking_id,
               detail={"reference": payhero_ref, "external_reference": reference,
                       "gateway": gateway.name, "amount": remaining, "pickup_fee": pickup})

    return {
        "authorization_url": result.get("authorization_url"),
        "reference": payhero_ref,
        "external_reference": reference,
        "gateway": gateway.name,
        "requires_stk": result.get("requires_stk", False),
        "amount_kes": float(remaining),
        "service_total": service_total,
        "pickup_fee": pickup,
        "message": (
            f"Send authorization_url to customer for KES {remaining} payment."
            if result.get("authorization_url")
            else f"Ask the customer to approve the KES {remaining} STK prompt."
        ),
    }


def get_final_payment_status(booking_id: str) -> dict:
    row = db.fetch_one(
        "bluetech",
        """SELECT final_payment_status, final_receipt, final_cost, estimated_cost,
                  pickup_fee, fulfillment_type, commitment_fee, final_payment_reference
             FROM bookings WHERE id = %s""",
        (booking_id,),
    )
    if not row:
        raise ValueError("Booking not found")
    return row


# ── Verify (client polling) ───────────────────────────────────────────────────

def _resolve_kind_by_reference(reference: str) -> tuple[str | None, str | None]:
    """Find (kind, entity_id) for a PayHero payment reference in bluetech-db."""
    order = db.fetch_one(
        "bluetech",
        "SELECT id, total_amount FROM orders WHERE payment_reference = %s",
        (reference,),
    )
    if order:
        return "order", str(order["id"])

    commitment = db.fetch_one(
        "bluetech",
        """SELECT id, commitment_fee FROM bookings
           WHERE commitment_payment_reference = %s""",
        (reference,),
    )
    if commitment:
        return "commitment", str(commitment["id"])

    final = db.fetch_one(
        "bluetech",
        """SELECT id, final_cost, pickup_fee, commitment_fee
           FROM bookings WHERE final_payment_reference = %s""",
        (reference,),
    )
    if final:
        return "final", str(final["id"])

    return None, None


def _expected_amount(kind: str | None, entity_id: str | None) -> float | None:
    """Expected amount for a kind/entity (final = service + pickup - commitment)."""
    if kind == "order":
        row = db.fetch_one(
            "bluetech",
            "SELECT total_amount FROM orders WHERE id = %s",
            (entity_id,),
        )
        return float(row["total_amount"]) if row else None
    if kind == "commitment":
        row = db.fetch_one(
            "bluetech",
            "SELECT commitment_fee FROM bookings WHERE id = %s",
            (entity_id,),
        )
        return float(row["commitment_fee"]) if row else None
    if kind == "final":
        row = db.fetch_one(
            "bluetech",
            """SELECT final_cost, pickup_fee, commitment_fee FROM bookings WHERE id = %s""",
            (entity_id,),
        )
        if row:
            return (
                float(row["final_cost"] or 0)
                + float(row["pickup_fee"] or 0)
                - float(row["commitment_fee"] or 0)
            )
    return None


def verify_payment(reference: str) -> dict:
    """Verify a payment by PayHero reference and apply the result idempotently."""
    gateway = get_gateway(None)
    result = gateway.verify_transaction(reference)

    kind, entity_id = _resolve_kind_by_reference(reference)
    expected_amount = _expected_amount(kind, entity_id)

    if result.get("status") == "paid" and kind:
        receipt = result.get("receipt") or reference
        _apply_paid(kind, reference, receipt, result)
    else:
        _record_result(reference, result, kind=kind, entity_id=entity_id)

    return {
        "status": result.get("status"),
        "reference": reference,
        "amount_kes": expected_amount or result.get("amount_kes"),
        "gateway": result.get("gateway"),
    }


# ── Webhook processing ────────────────────────────────────────────────────────

def process_gateway_event(gateway_name: str, event: dict) -> None:
    """Apply a verified Payhero webhook event. Idempotent."""
    try:
        if gateway_name != "payhero":
            logger.warning("Unsupported gateway webhook '%s'", gateway_name)
            return

        data = event.get("response") or {}
        raw_status = str(data.get("Status") or data.get("status") or "").upper()
        if raw_status not in ("SUCCESS", "SUCCESSFUL", "PAID", "COMPLETED"):
            return
        if int(data.get("ResultCode") or 0) != 0:
            return

        external_ref = (
            data.get("ExternalReference") or data.get("external_reference") or ""
        )
        txn = db.fetch_one(
            "payments",
            "SELECT * FROM payments_transaction WHERE external_ref = %s",
            (external_ref,),
        ) if external_ref else None
        if not txn:
            logger.warning("Payhero webhook for unknown external ref %s", external_ref)
            return

        gateway_ref = txn.get("gateway_ref") or data.get("reference") or external_ref
        result = get_gateway(None).verify_transaction(gateway_ref)

        amount_expected = float(txn.get("amount_kes") or 0)
        amount_callback = float(data.get("Amount") or data.get("amount") or 0)
        if amount_callback and abs(amount_callback - amount_expected) > 0.01:
            logger.warning(
                "Amount mismatch for %s: callback=%s expected=%s",
                external_ref,
                amount_callback,
                amount_expected,
            )
            return

        _apply_paid(
            txn.get("kind"),
            gateway_ref,
            result.get("receipt") or data.get("MpesaReceiptNumber") or gateway_ref,
            result,
        )

    except Exception as exc:
        logger.error("Webhook processing error (%s): %s", gateway_name, exc)
