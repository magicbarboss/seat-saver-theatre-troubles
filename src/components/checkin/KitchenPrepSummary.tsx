import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Guest {
  id?: string;
  booking_code?: string;
  booker_name?: string;
  total_quantity?: number;
  ticket_data?: any;
  extracted_tickets?: any;
  [key: string]: any;
}

interface BookingGroup {
  mainBooking?: Guest;
  addOns?: Guest[];
  [key: string]: any;
}

interface WalkInGuest extends Guest {}

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
  
  // Enhanced ticket type mapping for food calculation
  const TICKET_TYPE_MAPPING: Record<string, {
    drinks?: {
      type: string;
      quantity: number;
      perPerson?: boolean;
    };
    pizza?: {
      quantity: number;
      shared?: boolean;
    };
    extras?: string[];
    minimum_people?: number;
  }> = {
    // Standard House Magicians tickets
    'House Magicians Show Ticket': {},
    'House Magicians Show Ticket & 2 Drinks': {
      drinks: {
        type: 'drinks',
        quantity: 2,
        perPerson: true
      }
    },
    'House Magicians Show Ticket & 1 Pizza': {
      pizza: {
        quantity: 1,
        shared: false
      }
    },
    'House Magicians Show Ticket includes 2 Drinks + 1 Pizza': {
      drinks: {
        type: 'drinks',
        quantity: 2,
        perPerson: true
      },
      pizza: {
        quantity: 1,
        shared: false
      }
    },
    'House Magicians Show Ticket & 2 soft drinks': {
      drinks: {
        type: 'soft drinks',
        quantity: 2,
        perPerson: true
      }
    },
    // Adult Show tickets
    'Adult Show Ticket includes 2 Drinks': {
      drinks: {
        type: 'Drinks',
        quantity: 2,
        perPerson: true
      }
    },
    'Adult Show Ticket includes 2 Drinks + 9" Pizza': {
      drinks: {
        type: 'Drinks',
        quantity: 2,
        perPerson: true
      },
      pizza: {
        quantity: 1,
        shared: false
      }
    },
    'Adult Show Ticket induces 2 soft drinks': {
      drinks: {
        type: 'Soft Drinks',
        quantity: 2,
        perPerson: true
      }
    },
    'Adult Show Ticket induces 2 soft drinks + 9" PIzza': {
      drinks: {
        type: 'Soft Drinks',
        quantity: 2,
        perPerson: true
      },
      pizza: {
        quantity: 1,
        shared: false
      }
    },
    'Adult Show Ticket induces 2 soft drinks + 9 PIzza': {
      drinks: {
        type: 'Soft Drinks',
        quantity: 2,
        perPerson: true
      },
      pizza: {
        quantity: 1,
        shared: false
      }
    },
    // Comedy tickets
    'Comedy ticket plus 9" Pizza': {
      pizza: {
        quantity: 1,
        shared: false
      }
    },
    'Comedy ticket plus 9 Pizza': {
      pizza: {
        quantity: 1,
        shared: false
      }
    },
    'Adult Comedy & Magic Show Ticket + 9" Pizza': {
      pizza: {
        quantity: 1,
        shared: false
      }
    },
    'Adult Comedy & Magic Show Ticket + 9 Pizza': {
      pizza: {
        quantity: 1,
        shared: false
      }
    },
    'Adult Comedy Magic Show ticket': {},
    // Groupon packages
    'Groupon Offer Prosecco Package (per person)': {
      drinks: {
        type: 'glass of prosecco',
        quantity: 1,
        perPerson: true
      },
      pizza: {
        quantity: 0.5,
        shared: true
      },
      extras: ['fries per couple']
    },
    'Groupon Magic & Pints Package (per person)': {
      drinks: {
        type: 'house pint',
        quantity: 1,
        perPerson: true
      },
      pizza: {
        quantity: 0.5,
        shared: true
      },
      extras: ['fries per couple']
    },
    'Groupon Magic & Cocktails Package (per person)': {
      drinks: {
        type: 'house cocktail',
        quantity: 1,
        perPerson: true
      },
      pizza: {
        quantity: 0.5,
        shared: true
      },
      extras: ['loaded fries per couple']
    },
    'Groupon Magic Show, Snack and Loaded Fries Package (per person)': {
      drinks: {
        type: 'Drink',
        quantity: 1,
        perPerson: true
      },
      pizza: {
        quantity: 1,
        shared: true
      },
      extras: ['Loaded Fries (shared)']
    },
    'OLD Groupon Offer (per person - extras are already included)': {
      drinks: {
        type: 'Drink',
        quantity: 1,
        perPerson: true
      },
      pizza: {
        quantity: 1,
        shared: true
      }
    },
    // Wowcher packages
    'Wowcher Magic & Cocktails Package (per person)': {
      drinks: {
        type: 'Cocktail',
        quantity: 1,
        perPerson: true
      },
      pizza: {
        quantity: 1,
        shared: true
      },
      extras: ['Loaded Fries (shared)']
    }
  };

  // Get all ticket types for a guest - same logic as CheckInSystem
  const getAllTicketTypes = (guest: Guest): Array<{
    type: string;
    quantity: number;
  }> => {
    const tickets: Array<{
      type: string;
      quantity: number;
    }> = [];

    // First try: extracted_tickets from ticket_data (nested structure)
    if (guest.ticket_data && typeof guest.ticket_data === 'object') {
      const extractedTickets = (guest.ticket_data as any).extracted_tickets;
      if (extractedTickets && typeof extractedTickets === 'object') {
        Object.entries(extractedTickets).forEach(([type, quantity]) => {
          if (type && type !== '' && typeof quantity === 'number' && quantity > 0) {
            tickets.push({
              type,
              quantity
            });
          }
        });
      }
    }

    // Second try: direct extracted_tickets property
    if (tickets.length === 0 && guest.extracted_tickets && typeof guest.extracted_tickets === 'object') {
      Object.entries(guest.extracted_tickets).forEach(([type, quantity]) => {
        if (type && type !== '' && typeof quantity === 'number' && quantity > 0) {
          tickets.push({
            type,
            quantity
          });
        }
      });
    }

    // Fallback: parse all ticket_data fields with fuzzy matching
    if (tickets.length === 0 && guest.ticket_data && typeof guest.ticket_data === 'object') {
      Object.entries(guest.ticket_data).forEach(([key, value]) => {
        // Skip non-ticket fields
        if (!key || ['booker_name', 'booking_code', 'notes', 'show_time', 'extracted_tickets', 'Booker', 'Booking', 'Booking Code', 'Item', 'Note', 'Status', 'Total', 'Total Quantity', 'DIET', 'Friends', 'Guests', 'Magic', 'TERMS'].includes(key)) {
          return;
        }

        // Parse quantity - handle various formats
        let quantity = 0;
        if (typeof value === 'number' && value > 0) {
          quantity = value;
        } else if (typeof value === 'string' && value.trim() !== '') {
          const parsed = parseInt(value);
          if (!isNaN(parsed) && parsed > 0) {
            quantity = parsed;
          }
        }

        // If we found a quantity or this looks like a ticket type, add it
        if (quantity > 0 || Object.keys(TICKET_TYPE_MAPPING).includes(key)) {
          tickets.push({
            type: key,
            quantity: quantity || 1
          });
        }
      });
    }
    return tickets;
  };

  const calculateTotals = () => {
    console.log("=== KITCHEN PREP CALCULATION START ===");
    console.log("Filtered Bookings:", filteredBookings?.length || 0);
    console.log("Walk-in Guests:", walkInGuests?.length || 0);
    
    let totalPizzas = 0;
    let totalFries = 0;
    let totalLoadedFries = 0;
    
    // Track processed guests to prevent duplicate counting
    const processedGuests = new Set<string>();

    const processGuest = (guest: Guest) => {
      // Create unique identifier for guest to prevent duplicates
      const guestId = guest.id || `${guest.booking_code}-${guest.booker_name}`;
      
      if (processedGuests.has(guestId)) {
        console.log("DUPLICATE DETECTED - Skipping guest:", guest.booker_name, guestId);
        return;
      }
      
      processedGuests.add(guestId);
      console.log("Processing guest:", guest.booker_name, "with", guest.total_quantity || 1, "people");

      const guestCount = guest.total_quantity || 1;
      
      // Handle special "paid in gyg" case
      if (guest.booking_code && guest.booking_code.toLowerCase().includes('paid in gyg')) {
        const couples = Math.ceil(guestCount / 2);
        totalPizzas += couples;
        totalFries += couples;
        console.log(`GYG booking - ${couples} pizzas and ${couples} fries for ${guest.booker_name}`);
        return;
      }

      // Get structured ticket data
      const tickets = getAllTicketTypes(guest);
      
      tickets.forEach(ticket => {
        const packageInfo = TICKET_TYPE_MAPPING[ticket.type];
        
        if (packageInfo) {
          // Calculate pizzas
          if (packageInfo.pizza) {
            let pizzaCount = 0;
            if (packageInfo.pizza.shared) {
              // Shared items: use Math.ceil(guestCount / 2) for couples
              pizzaCount = packageInfo.pizza.quantity * Math.ceil(guestCount / 2);
            } else {
              // Per person items: quantity * guest count
              pizzaCount = packageInfo.pizza.quantity * guestCount;
            }
            totalPizzas += pizzaCount;
            console.log(`${ticket.type}: +${pizzaCount} pizzas (${packageInfo.pizza.shared ? 'shared' : 'per-person'}) for ${guest.booker_name}`);
          }

          // Calculate fries from extras
          if (packageInfo.extras) {
            packageInfo.extras.forEach(extra => {
              const extraLower = extra.toLowerCase();
              if (extraLower.includes('loaded fries')) {
                const couples = Math.ceil(guestCount / 2);
                totalLoadedFries += couples;
                console.log(`${ticket.type}: +${couples} loaded fries for ${guest.booker_name}`);
              } else if (extraLower.includes('fries') && !extraLower.includes('loaded')) {
                const couples = Math.ceil(guestCount / 2);
                totalFries += couples;
                console.log(`${ticket.type}: +${couples} fries for ${guest.booker_name}`);
              }
            });
          }
        } else {
          console.log(`Unknown ticket type: ${ticket.type} for ${guest.booker_name}`);
        }
      });
    };

    // Process booking groups - only main bookings to avoid double counting
    if (filteredBookings && Array.isArray(filteredBookings)) {
      filteredBookings.forEach(group => {
        if (group?.mainBooking) {
          processGuest(group.mainBooking);
        }
        // Skip add-ons as they should be part of the main booking calculation
      });
    }

    // Process walk-in guests
    if (walkInGuests && Array.isArray(walkInGuests)) {
      walkInGuests.forEach(guest => {
        processGuest(guest);
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