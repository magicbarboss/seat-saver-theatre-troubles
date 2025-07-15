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

    // Process booking groups
    filteredBookings.forEach(group => {
      group.bookings.forEach((guest: any) => {
        const orderSummary = getOrderSummary(guest);
        
        // Extract pizza count
        const pizzaMatch = orderSummary.match(/(\d+)\s+pizza/i);
        if (pizzaMatch) {
          totalPizzas += parseInt(pizzaMatch[1]);
        }
        
        // Extract fries count (but not loaded fries)
        const friesMatch = orderSummary.match(/(\d+)\s+fries(?!\s+\(loaded\))/i);
        if (friesMatch) {
          totalFries += parseInt(friesMatch[1]);
        }
        
        // Extract loaded fries count
        const loadedFriesMatch = orderSummary.match(/(\d+)\s+(?:loaded\s+)?fries\s+\(loaded\)|(\d+)\s+loaded\s+fries/i);
        if (loadedFriesMatch) {
          totalLoadedFries += parseInt(loadedFriesMatch[1] || loadedFriesMatch[2]);
        }
      });
    });

    // Process walk-in guests
    walkInGuests.forEach(guest => {
      const orderSummary = getOrderSummary(guest);
      
      // Extract pizza count
      const pizzaMatch = orderSummary.match(/(\d+)\s+pizza/i);
      if (pizzaMatch) {
        totalPizzas += parseInt(pizzaMatch[1]);
      }
      
      // Extract fries count (but not loaded fries)
      const friesMatch = orderSummary.match(/(\d+)\s+fries(?!\s+\(loaded\))/i);
      if (friesMatch) {
        totalFries += parseInt(friesMatch[1]);
      }
      
      // Extract loaded fries count
      const loadedFriesMatch = orderSummary.match(/(\d+)\s+(?:loaded\s+)?fries\s+\(loaded\)|(\d+)\s+loaded\s+fries/i);
      if (loadedFriesMatch) {
        totalLoadedFries += parseInt(loadedFriesMatch[1] || loadedFriesMatch[2]);
      }
    });

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