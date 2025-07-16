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
    
    // Track processed guests to prevent duplicate counting
    const processedGuests = new Set<string>();

    // Helper functions for regex matching
    const isPizza = (item: string) => item.match(/(\d+)\s*pizzas?/i);
    const isLoadedFries = (item: string) => item.match(/(\d+)\s*loaded\s*fries/i);
    const isFries = (item: string) => item.match(/(\d+)\s*fries(?!.*loaded)/i);

    const processOrderSummary = (orderSummary: string, guest: any) => {
      // Create unique identifier for guest to prevent duplicates
      const guestId = guest.id || `${guest.booking_code}-${guest.booker_name}`;
      
      if (processedGuests.has(guestId)) {
        console.log("DUPLICATE DETECTED - Skipping guest:", guest.booker_name, guestId);
        return;
      }
      
      processedGuests.add(guestId);
      console.log("Processing ORDER SUMMARY:", orderSummary, "for guest:", guest.booker_name);

      if (!orderSummary) {
        console.log("No order summary for guest:", guest.booker_name || guest.name);
        return;
      }

      const items = orderSummary.split(',').map(item => item.trim());

      items.forEach(item => {
        const pizzaMatch = isPizza(item);
        const loadedFriesMatch = isLoadedFries(item);
        const friesMatch = isFries(item);

        if (pizzaMatch) {
          const count = parseInt(pizzaMatch[1]);
          totalPizzas += count;
          console.log(`Found ${count} pizza(s): "${item}" for ${guest.booker_name}`);
        }

        if (loadedFriesMatch) {
          const count = parseInt(loadedFriesMatch[1]);
          totalLoadedFries += count;
          console.log(`Found ${count} loaded fries: "${item}" for ${guest.booker_name}`);
        }

        if (friesMatch) {
          const count = parseInt(friesMatch[1]);
          totalFries += count;
          console.log(`Found ${count} fries: "${item}" for ${guest.booker_name}`);
        }
      });
    };

    // Process booking groups - only main bookings to avoid double counting
    if (filteredBookings && Array.isArray(filteredBookings)) {
      filteredBookings.forEach(group => {
        if (group?.mainBooking) {
          const mainOrder = getOrderSummary(group.mainBooking);
          processOrderSummary(mainOrder, group.mainBooking);
        }
        // Skip add-ons as they should be part of the main booking calculation
      });
    }

    // Process walk-in guests
    if (walkInGuests && Array.isArray(walkInGuests)) {
      walkInGuests.forEach(guest => {
        const orderSummary = getOrderSummary(guest);
        processOrderSummary(orderSummary, guest);
      });
    }

    console.log("=== FINAL TOTALS ===");
    console.log("Total Pizzas:", totalPizzas);
    console.log("Total Fries:", totalFries);
    console.log("Total Loaded Fries:", totalLoadedFries);
    console.log("Processed Guests:", processedGuests.size);
    
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