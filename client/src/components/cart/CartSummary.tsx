import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Loader2, ArrowRight, Truck } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { getDeliveryZones } from '../../api/zones';
import { DeliveryZone } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { buildOrderMessage, openWhatsApp } from '../../utils/whatsapp';
import Button from '../common/Button';

export const CartSummary = () => {
  const { subtotal, items } = useCart();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [loadingZones, setLoadingZones] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const data = await getDeliveryZones();
        const zonesArray = Array.isArray(data) ? data : [];
        setZones(zonesArray);
        
        // Restore pre-selected zone from sessionStorage if any
        const savedZone = sessionStorage.getItem('bluetech_delivery_zone_id');
        if (savedZone) {
          setSelectedZoneId(savedZone);
        }
      } catch (err) {
        console.error('Failed to load delivery zones:', err);
        setZones([]);
      } finally {
        setLoadingZones(false);
      }
    };
    fetchZones();
  }, []);

  const selectedZone = Array.isArray(zones) ? zones.find(z => z.id === selectedZoneId) : null;
  const deliveryFee = selectedZone ? selectedZone.delivery_fee : 0;
  const grandTotal = subtotal + deliveryFee;

  const handleZoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedZoneId(id);
    sessionStorage.setItem('bluetech_delivery_zone_id', id);
  };

  const handleCheckout = () => {
    if (!selectedZoneId) return;
    navigate('/checkout');
  };

  const handleWhatsAppOrder = () => {
    const msg = buildOrderMessage({
      items: items.map(i => ({
        name:     i.product.name || i.product.title || 'Product',
        quantity: i.quantity,
        price:    i.product.price,
      })),
      subtotal,
      deliveryZone: selectedZone?.zone_name,
      deliveryFee,
      total: grandTotal,
    });
    openWhatsApp(msg);
  };

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-6 text-left sticky top-24 shadow-xs">
      <h3 className="font-bold text-slate-950 text-base border-b border-slate-200 pb-3">
        Order Summary
      </h3>

      {/* Calculations block */}
      <div className="space-y-3 text-sm">
        <div className="flex justify-between font-medium text-slate-600">
          <span>Items Subtotal</span>
          <span className="text-slate-900 font-bold">{formatCurrency(subtotal)}</span>
        </div>

        {/* Zone Selector */}
        <div className="space-y-1.5 pt-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Select Delivery Zone
          </label>
          
          {loadingZones ? (
            <div className="flex items-center space-x-1.5 py-1 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Loading delivery rates...</span>
            </div>
          ) : (
            <div className="relative">
              <select
                value={selectedZoneId}
                onChange={handleZoneChange}
                className="w-full py-2.5 px-3 border-2 border-slate-200 bg-white rounded-lg text-xs font-bold outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="">-- Choose Shipping Zone --</option>
                {zones.map(z => (
                  <option key={z.id} value={z.id}>
                    {z.zone_name} ({formatCurrency(z.delivery_fee)})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-between font-medium text-slate-600 border-t border-slate-150 pt-3">
          <span>Delivery Charges</span>
          <span className="text-slate-900 font-bold">
            {selectedZone ? formatCurrency(deliveryFee) : <span className="text-xs text-slate-400 font-normal">Pending zone choice</span>}
          </span>
        </div>

        <div className="flex justify-between border-t-2 border-slate-200 pt-4 text-base font-black text-slate-950">
          <span>Grand Total</span>
          <span className="text-lg text-blue-600 font-extrabold">{formatCurrency(grandTotal)}</span>
        </div>
      </div>

      {/* Checkout Button */}
      <div className="pt-2 space-y-3">
        <Button
          variant="primary"
          disabled={!selectedZoneId || subtotal <= 0}
          onClick={handleCheckout}
          className="w-full py-4 text-sm font-bold tracking-wider uppercase shadow-md shadow-blue-100"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          {selectedZoneId ? 'Proceed to Checkout' : 'Select Zone to Checkout'}
        </Button>

        {/* Order via WhatsApp */}
        <button
          type="button"
          onClick={handleWhatsAppOrder}
          disabled={subtotal <= 0}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-green-500 text-green-600 bg-white hover:bg-green-50 font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {/* WhatsApp SVG icon */}
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Order via WhatsApp
        </button>

        {!selectedZoneId && (
          <p className="text-[10px] text-center text-slate-400 mt-2 flex items-center justify-center space-x-1 font-semibold">
            <Truck className="w-3 h-3 text-current" />
            <span>Shipping zone selection is required to checkout.</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default CartSummary;
