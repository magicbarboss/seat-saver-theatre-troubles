import React from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GuestRow } from './GuestRow';

interface Guest {
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
}

interface BookingGroup {
  mainBooking: Guest;
  addOns: Guest[];
  originalIndex: number;
  addOnIndices: number[];
}

interface PartyGroup {
  id: string;
  bookingIndices: number[];
  totalGuests: number;
  guestNames: string[];
  connectionType: 'mutual' | 'one-way';
}

interface GuestTableProps {
  bookingGroups: BookingGroup[];
  guests: Guest[];
  checkedInGuests: Set<number>;
  seatedGuests: Set<number>;
  allocatedGuests: Set<number>;
  pagerAssignments: Map<number, number>;
  guestTableAllocations: Map<number, number[]>;
  partyGroups: Map<string, PartyGroup>;
  bookingComments: Map<number, string>;
  guestNotes: Map<number, string>;
  walkInGuests: Guest[];
  getOrderSummary: (guest: Guest, totalGuestCount?: number, addOnGuests?: Guest[]) => string;
  getPackageDetails: (guest: Guest) => Array<{
    type: string;
    quantity: number;
    details: string[];
  }>;
  extractGuestName: (name: string, ticketData?: any) => string;
  onCheckIn: (index: number) => void;
  onPagerAction: (index: number, pagerNumber?: number) => void;
  onTableAllocate: (index: number) => void;
  onSeat: (index: number) => void;
  onComment: (index: number) => void;
  onNotesChange: (index: number, notes: string) => void;
  onManualEdit?: (index: number) => void;
}

export const GuestTable = ({
  bookingGroups,
  guests,
  checkedInGuests,
  seatedGuests,
  allocatedGuests,
  pagerAssignments,
  guestTableAllocations,
  partyGroups,
  bookingComments,
  guestNotes,
  walkInGuests,
  getOrderSummary,
  getPackageDetails,
  extractGuestName,
  onCheckIn,
  onPagerAction,
  onTableAllocate,
  onSeat,
  onComment,
  onNotesChange,
  onManualEdit
}: GuestTableProps) => {
  // Helper function to get party info for a guest
  const getPartyInfo = (guestIndex: number) => {
    for (const [partyId, party] of partyGroups) {
      if (party.bookingIndices.includes(guestIndex)) {
        return {
          isInParty: true,
          partySize: party.totalGuests,
          partyMembers: party.guestNames
        };
      }
    }
    return { isInParty: false, partySize: 0, partyMembers: [] };
  };

  // Helper function to get current guest data from guests array
  const getCurrentGuest = (originalIndex: number): Guest => {
    return guests[originalIndex] || bookingGroups.find(g => g.originalIndex === originalIndex)?.mainBooking || ({} as Guest);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Guest Name</TableHead>
          <TableHead className="text-center">Count</TableHead>
          <TableHead>Show Time</TableHead>
          <TableHead>Orders</TableHead>
          <TableHead>Check-in</TableHead>
          <TableHead>Pager</TableHead>
          <TableHead>Table/Seating</TableHead>
          <TableHead>Booking</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookingGroups.map((group) => {
          return (
            <GuestRow
              key={group.originalIndex}
              guest={group.mainBooking}
              index={group.originalIndex}
              isCheckedIn={checkedInGuests.has(group.originalIndex)}
              isSeated={seatedGuests.has(group.originalIndex)}
              isAllocated={allocatedGuests.has(group.originalIndex)}
              pagerNumber={pagerAssignments.get(group.originalIndex)}
              tableNumbers={guestTableAllocations.get(group.originalIndex) || []}
              orderSummary={getOrderSummary(group.mainBooking, undefined, group.addOns)}
              packageDetails={getPackageDetails(group.mainBooking)}
              comment={bookingComments.get(group.originalIndex)}
              notes={guestNotes.get(group.originalIndex) || ''}
              addOnGuests={group.addOns}
              partyInfo={getPartyInfo(group.originalIndex)}
              onCheckIn={onCheckIn}
              onPagerAction={onPagerAction}
              onTableAllocate={onTableAllocate}
              onSeat={onSeat}
              onComment={onComment}
              onNotesChange={onNotesChange}
              onManualEdit={onManualEdit}
            />
          );
        })}
        
        {walkInGuests.map((walkIn, index) => {
          const walkInIndex = 10000 + index; // Use large index to avoid conflicts
          return (
            <GuestRow
              key={`walk-in-${index}`}
              guest={walkIn}
              index={walkInIndex}
              isCheckedIn={checkedInGuests.has(walkInIndex)}
              isSeated={seatedGuests.has(walkInIndex)}
              isAllocated={allocatedGuests.has(walkInIndex)}
              pagerNumber={pagerAssignments.get(walkInIndex)}
              tableNumbers={guestTableAllocations.get(walkInIndex) || []}
              orderSummary={getOrderSummary(walkIn)}
              packageDetails={getPackageDetails(walkIn)}
              comment={bookingComments.get(walkInIndex)}
              notes={guestNotes.get(walkInIndex) || ''}
              isWalkIn={true}
              onCheckIn={onCheckIn}
              onPagerAction={onPagerAction}
              onTableAllocate={onTableAllocate}
              onSeat={onSeat}
              onComment={onComment}
              onNotesChange={onNotesChange}
              onManualEdit={onManualEdit}
            />
          );
        })}
      </TableBody>
    </Table>
  );
};