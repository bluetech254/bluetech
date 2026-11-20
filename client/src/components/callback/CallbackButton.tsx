/**
 * CallbackButton — F4
 *
 * Floating "Request callback" button, bottom-right corner.
 * On click opens a small modal: phone input + optional note.
 * Submits to POST /api/v1/analytics/callback-request.
 */
import React, { useState } from "react";
import { Phone, X, Loader2 } from "lucide-react";
import { requestCallback } from "../../lib/analytics";
import toast from "react-hot-toast";

export default function CallbackButton() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setSubmitting(true);
    const ok = await requestCallback(phone.trim(), note.trim() || undefined);
    setSubmitting(false);
    if (ok) {
      setDone(true);
      toast.success("We'll call you back shortly!");
      setTimeout(() => { setOpen(false); setDone(false); setPhone(""); setNote(""); }, 2000);
    } else {
      toast.error("Failed to submit. Please try WhatsApp instead.");
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg transition-all"
        aria-label="Request a callback"
      >
        <Phone size={15} />
        <span className="hidden sm:inline">Request callback</span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-900">Request a callback</h2>
                <p className="text-xs text-gray-500 mt-0.5">We'll call you within the hour</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {done ? (
              <div className="text-center py-4">
                <div className="text-3xl mb-2">✅</div>
                <p className="font-semibold text-gray-800">Request received!</p>
                <p className="text-sm text-gray-500">We'll call you back shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Phone number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="07XX XXX XXX"
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    What can we help with? <span className="text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="e.g. iPhone screen repair, laptop quote..."
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || !phone.trim()}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <Phone size={15} />}
                  {submitting ? "Submitting..." : "Request callback"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
