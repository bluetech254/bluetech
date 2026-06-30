import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Loader2, ArrowRight, Truck } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { getDeliveryZones } from '../../api/zones';
import { DeliveryZone } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import Button from '../common/Button';

export const CartSummary = () => {
  const { subtotal } = useCart();
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
      <div className="pt-2">
        <Button
          variant="primary"
          disabled={!selectedZoneId || subtotal <= 0}
          onClick={handleCheckout}
          className="w-full py-4 text-sm font-bold tracking-wider uppercase shadow-md shadow-blue-100"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          {selectedZoneId ? 'Proceed to Checkout' : 'Select Zone to Checkout'}
        </Button>
        
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
