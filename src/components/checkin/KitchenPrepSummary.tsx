import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BookingGroup {
  [key: string]: any;
}

interface WalkInGuest {
  [key: string]: any;
}

interface KitchenPrepSummaryProps {
  filteredBookings: BookingGroup[];
  walkInGuests: WalkInGuest[];
  getOrderSummary: (guest: any) => string;
}

export const KitchenPrepSummary = ({ 
  filteredBookings, 
  walkInGuests, 
  getOrderSummary 
}: KitchenPrepSummaryProps) => {
  const calculateTotals = () => {
    let totalPizzas = 0;
    let totalFries = 0;
    let totalLoadedFries = 0;

    // Process booking groups - add null checks
    if (filteredBookings && Array.isArray(filteredBookings)) {
      filteredBookings.forEach(group => {
        if (group && group.bookings && Array.isArray(group.bookings)) {
          group.bookings.forEach((guest: any) => {
            const orderSummary = getOrderSummary(guest);
            
            // Extract pizza count
            const pizzaMatch = orderSummary.match(/(\d+)\s*pizza/i);
            if (pizzaMatch) {
              totalPizzas += parseInt(pizzaMatch[1]);
            }
            
            // Extract loaded fries count (process first to avoid double-counting)
            const loadedFriesMatch = orderSummary.match(/(\d+)\s*loaded\s*fries/i);
            if (loadedFriesMatch) {
              totalLoadedFries += parseInt(loadedFriesMatch[1]);
            }
            
            // Extract fries count (excluding loaded fries)
            const friesMatch = orderSummary.match(/(\d+)\s*fries(?!.*loaded)/i);
            if (friesMatch) {
              totalFries += parseInt(friesMatch[1]);
            }
          });
        }
      });
    }

    // Process walk-in guests - add null checks
    if (walkInGuests && Array.isArray(walkInGuests)) {
      walkInGuests.forEach(guest => {
        const orderSummary = getOrderSummary(guest);
        
        // Extract pizza count
        const pizzaMatch = orderSummary.match(/(\d+)\s*pizza/i);
        if (pizzaMatch) {
          totalPizzas += parseInt(pizzaMatch[1]);
        }
        
        // Extract loaded fries count (process first to avoid double-counting)
        const loadedFriesMatch = orderSummary.match(/(\d+)\s*loaded\s*fries/i);
        if (loadedFriesMatch) {
          totalLoadedFries += parseInt(loadedFriesMatch[1]);
        }
        
        // Extract fries count (excluding loaded fries)
        const friesMatch = orderSummary.match(/(\d+)\s*fries(?!.*loaded)/i);
        if (friesMatch) {
          totalFries += parseInt(friesMatch[1]);
        }
      });
    }

    return { totalPizzas, totalFries, totalLoadedFries };
  };

  const { totalPizzas, totalFries, totalLoadedFries } = calculateTotals();

  return (
    <Card className="mb-6 bg-slate-50 border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-slate-700 flex items-center gap-2">
          🍕 Kitchen Prep Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
            <div className="text-2xl font-bold text-orange-600">{totalPizzas}</div>
            <div className="text-sm text-slate-600 font-medium">Pizzas</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
            <div className="text-2xl font-bold text-yellow-600">{totalFries}</div>
            <div className="text-sm text-slate-600 font-medium">Fries</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
            <div className="text-2xl font-bold text-red-600">{totalLoadedFries}</div>
            <div className="text-sm text-slate-600 font-medium">Loaded Fries</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};