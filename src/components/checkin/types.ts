export interface Guest {
  [key: string]: any;
  id: string;
  booking_code: string;
  booker_name: string;
  total_quantity: number;
  is_checked_in: boolean;
  pager_number: number | null;
  table_assignments: number[] | null;
  interval_pizza_order?: boolean;
  interval_drinks_order?: boolean;
  diet_info?: string;
  magic_info?: string;
  manual_override?: boolean;
  arriving_late?: boolean;
}


export interface CheckInSystemProps {
  guests: Guest[];
  headers: string[];
  showTimes: string[];
  guestListId: string;
}

export interface BookingGroup {
  mainBooking: Guest;
  addOns: Guest[];
  originalIndex: number;
  addOnIndices: number[];
}

export interface CheckedInGuest {
  guest: Guest;
  name: string;
  count: number;
  showTime: string;
  originalIndex: number;
  pagerNumber?: number;
  hasBeenSeated?: boolean;
  hasTableAllocated?: boolean;
  isWalkIn?: boolean;
  pizzaSelections?: string[];
}

export interface PartyGroup {
  id: string;
  bookingIndices: number[];
  totalGuests: number;
  guestNames: string[];
  connectionType: 'mutual' | 'one-way';
}