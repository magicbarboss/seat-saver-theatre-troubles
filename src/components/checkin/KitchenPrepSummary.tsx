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
    console.log("=== KITCHEN PREP CALCULATION START ===");
    console.log("Filtered Bookings:", filteredBookings?.length || 0);
    console.log("Walk-in Guests:", walkInGuests?.length || 0);
    
    let totalPizzas = 0;
    let totalFries = 0;
    let totalLoadedFries = 0;

    // Process booking groups - add null checks
    if (filteredBookings && Array.isArray(filteredBookings)) {
      filteredBookings.forEach(group => {
        if (group && group.bookings && Array.isArray(group.bookings)) {
          group.bookings.forEach((guest: any) => {
            const orderSummary = getOrderSummary(guest);
            console.log("ORDER SUMMARY:", orderSummary);
            
            if (!orderSummary) {
              console.log("No order summary for guest:", guest.booker_name || guest.name);
              return;
            }
            
            // Split by commas to handle comma-separated items
            const items = orderSummary.split(',').map(item => item.trim());
            
            items.forEach(item => {
              // Extract pizza count - handles plural
              const pizzaMatch = item.match(/(\d+)\s*pizzas?/i);
              if (pizzaMatch) {
                const count = parseInt(pizzaMatch[1]);
                totalPizzas += count;
                console.log(`Found ${count} pizza(s) in: "${item}"`);
              }
              
              // Extract loaded fries count (process first to avoid double-counting)
              const loadedFriesMatch = item.match(/(\d+)\s*loaded\s*fries/i);
              if (loadedFriesMatch) {
                const count = parseInt(loadedFriesMatch[1]);
                totalLoadedFries += count;
                console.log(`Found ${count} loaded fries in: "${item}"`);
              }
              
              // Extract fries count (excluding loaded fries)
              const friesMatch = item.match(/(\d+)\s*fries(?!.*loaded)/i);
              if (friesMatch) {
                const count = parseInt(friesMatch[1]);
                totalFries += count;
                console.log(`Found ${count} fries in: "${item}"`);
              }
            });
          });
        }
      });
    }

    // Process walk-in guests - add null checks
    if (walkInGuests && Array.isArray(walkInGuests)) {
      walkInGuests.forEach(guest => {
        const orderSummary = getOrderSummary(guest);
        console.log("ORDER SUMMARY (Walk-in):", orderSummary);
        
        if (!orderSummary) {
          console.log("No order summary for walk-in guest:", guest.booker_name || guest.name);
          return;
        }
        
        // Split by commas to handle comma-separated items
        const items = orderSummary.split(',').map(item => item.trim());
        
        items.forEach(item => {
          // Extract pizza count - handles plural
          const pizzaMatch = item.match(/(\d+)\s*pizzas?/i);
          if (pizzaMatch) {
            const count = parseInt(pizzaMatch[1]);
            totalPizzas += count;
            console.log(`Found ${count} pizza(s) in walk-in: "${item}"`);
          }
          
          // Extract loaded fries count (process first to avoid double-counting)
          const loadedFriesMatch = item.match(/(\d+)\s*loaded\s*fries/i);
          if (loadedFriesMatch) {
            const count = parseInt(loadedFriesMatch[1]);
            totalLoadedFries += count;
            console.log(`Found ${count} loaded fries in walk-in: "${item}"`);
          }
          
          // Extract fries count (excluding loaded fries)
          const friesMatch = item.match(/(\d+)\s*fries(?!.*loaded)/i);
          if (friesMatch) {
            const count = parseInt(friesMatch[1]);
            totalFries += count;
            console.log(`Found ${count} fries in walk-in: "${item}"`);
          }
        });
      });
    }

    console.log("=== FINAL TOTALS ===");
    console.log("Total Pizzas:", totalPizzas);
    console.log("Total Fries:", totalFries);
    console.log("Total Loaded Fries:", totalLoadedFries);
    
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