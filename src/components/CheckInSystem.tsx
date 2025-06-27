import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Users, CheckCircle, User, Clock, Layout, Plus, Radio, MapPin, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import TableAllocation from './TableAllocation';

interface Guest {
  [key: string]: any;
  id: string;
  booking_code: string;
  booker_name: string;
  total_quantity: number;
  is_checked_in: boolean;
  pager_number: number | null;
  table_assignments: number[] | null;
}

interface CheckInSystemProps {
  guests: Guest[];
  headers: string[];
}

interface BookingGroup {
  mainBooking: Guest;
  addOns: Guest[];
  originalIndex: number;
  addOnIndices: number[];
}

interface CheckedInGuest {
  name: string;
  count: number;
  showTime: string;
  originalIndex: number;
  pagerNumber?: number;
  hasBeenSeated?: boolean;
  hasTableAllocated?: boolean;
}

const CheckInSystem = ({ guests, headers }: CheckInSystemProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState('all');
  const [checkedInGuests, setCheckedInGuests] = useState<Set<number>>(new Set());
  const [tableAssignments, setTableAssignments] = useState<Map<number, number>>(new Map());
  const [pagerAssignments, setPagerAssignments] = useState<Map<number, number>>(new Map()); // guestIndex -> pagerId
  const [seatedGuests, setSeatedGuests] = useState<Set<number>>(new Set()); // Track seated guests
  const [allocatedGuests, setAllocatedGuests] = useState<Set<number>>(new Set()); // Track guests with allocated tables
  const [guestTableAllocations, setGuestTableAllocations] = useState<Map<number, number[]>>(new Map()); // guestIndex -> tableIds
  const [availablePagers] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const [selectedGuestForPager, setSelectedGuestForPager] = useState<number | null>(null);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [isInitialized, setIsInitialized] = useState(false);

  // Load state on component mount (only once)
  useEffect(() => {
    const loadState = () => {
      try {
        const savedState = localStorage.getItem('checkin-system-state');
        if (savedState) {
          const state = JSON.parse(savedState);
          setCheckedInGuests(new Set(state.checkedInGuests || []));
          setPagerAssignments(new Map(state.pagerAssignments || []));
          setSeatedGuests(new Set(state.seatedGuests || []));
          setAllocatedGuests(new Set(state.allocatedGuests || []));
          setGuestTableAllocations(new Map(state.guestTableAllocations || []));
          console.log('Loaded saved state from', state.timestamp);
          
          toast({
            title: "🔄 State Restored",
            description: `Previous session data loaded from ${new Date(state.timestamp).toLocaleTimeString()}`,
          });
        }
      } catch (error) {
        console.error('Failed to load saved state:', error);
      }
      setIsInitialized(true);
    };

    loadState();
  }, []); // Empty dependency array - only run once on mount

  // Auto-save functionality - separate effect that only runs after initialization
  useEffect(() => {
    if (!isInitialized) return; // Don't save until we've loaded the initial state

    const saveState = () => {
      const state = {
        checkedInGuests: Array.from(checkedInGuests),
        pagerAssignments: Array.from(pagerAssignments.entries()),
        seatedGuests: Array.from(seatedGuests),
        allocatedGuests: Array.from(allocatedGuests),
        guestTableAllocations: Array.from(guestTableAllocations.entries()),
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('checkin-system-state', JSON.stringify(state));
      setLastSaved(new Date());
      console.log('Auto-saved state at', new Date().toLocaleTimeString());
    };

    // Set up auto-save interval
    const interval = setInterval(saveState, 30000); // Save every 30 seconds

    // Save on component unmount
    return () => {
      clearInterval(interval);
      saveState();
    };
  }, [isInitialized, checkedInGuests, pagerAssignments, seatedGuests, allocatedGuests, guestTableAllocations]);

  // Debug: Log headers to see what we're working with
  console.log('Available headers:', headers);
  console.log('Sample guest data:', guests[0]);
  console.log('All guests:', guests);

  // Group bookings by booking code to identify add-ons
  const groupedBookings = useMemo(() => {
    console.log('Processing guests for grouping:', guests.length);
    const groups = new Map<string, BookingGroup>();
    
    guests.forEach((guest, index) => {
      if (!guest || typeof guest !== 'object') {
        console.warn(`Invalid guest at index ${index}:`, guest);
        return;
      }

      // Use the booking_code directly from the guest object since it's already structured
      const bookingCode = guest.booking_code || '';
      console.log(`Guest ${index}: booking_code = "${bookingCode}"`);
      
      if (!bookingCode) {
        console.warn(`No booking code for guest at index ${index}:`, guest);
        return;
      }
      
      if (!groups.has(bookingCode)) {
        // First occurrence - this is the main booking
        console.log(`Creating new group for booking code: ${bookingCode}`);
        groups.set(bookingCode, {
          mainBooking: guest,
          addOns: [],
          originalIndex: index,
          addOnIndices: []
        });
      } else {
        // Subsequent occurrence - this is an add-on
        console.log(`Adding to existing group for booking code: ${bookingCode}`);
        const group = groups.get(bookingCode)!;
        group.addOns.push(guest);
        group.addOnIndices.push(index);
      }
    });
    
    const result = Array.from(groups.values());
    console.log(`Created ${result.length} booking groups from ${guests.length} guests`);
    console.log('Sample booking group:', result[0]);
    return result;
  }, [guests]);

  // Extract package information from ticket type fields
  const getPackageInfo = (guest: Guest) => {
    if (!guest || typeof guest !== 'object') return 'Show Only';
    
    // All the possible ticket type fields from the data
    const ticketTypeFields = [
      'Adult Show Ticket includes 2 Drinks',
      'Comedy ticket plus 9" Pizza', 
      'OLD Groupon Offer (per person - extras are already included)',
      'Adult Comedy & Magic Show Ticket + 9" Pizza',
      'Adult Show Ticket includes 2 Drinks + 9" Pizza',
      'Adult Show Ticket includes 2 soft drinks',
      'Adult Show Ticket induces 2 soft drinks + 9" PIzza',
      'Adult Comedy Magic Show ticket',
      'Smoke Offer Ticket includes Drink (minimum x2)',
      'Groupon Magic & Pints Package (per person)',
      'Groupon Magic & Cocktails Package (per person)',
      'Wowcher Magic & Cocktails Package (per person)'
    ];
    
    console.log('Checking package for guest:', guest.booker_name, 'Available fields:', Object.keys(guest));
    
    // Find the ticket type and extract package info
    for (const field of ticketTypeFields) {
      const value = guest[field];
      console.log(`Checking field "${field}": value = "${value}"`);
      
      if (value && value !== '' && value !== '0' && parseInt(value) > 0) {
        console.log(`Found active ticket type: ${field} with value: ${value}`);
        
        // Extract package information based on what's included
        if (field.includes('includes 2 Drinks + 9" Pizza')) {
          return '2 Drinks + 9" Pizza';
        } else if (field.includes('+ 9" Pizza')) {
          return '9" Pizza';
        } else if (field.includes('includes 2 Drinks')) {
          return '2 Drinks';
        } else if (field.includes('includes 2 soft drinks + 9" PIzza')) {
          return '2 Soft Drinks + 9" Pizza';
        } else if (field.includes('includes 2 soft drinks')) {
          return '2 Soft Drinks';
        } else if (field.includes('plus 9" Pizza')) {
          return '9" Pizza';
        } else if (field.includes('Magic & Pints Package')) {
          return 'Pints Package';
        } else if (field.includes('Magic & Cocktails Package')) {
          return 'Cocktails Package';
        } else if (field.includes('Smoke Offer')) {
          return 'Drinks (min x2)';
        } else if (field.includes('Groupon') || field.includes('OLD Groupon')) {
          return 'Groupon Package';
        } else {
          return 'Show Only';
        }
      }
    }
    
    return 'Show Only';
  };

  // Extract ticket type - focus on package information (drinks + pizza)
  const getTicketType = (guest: Guest) => {
    if (!guest || typeof guest !== 'object') return 'Show Ticket';
    
    // All the possible ticket type fields from the data
    const ticketTypeFields = [
      'Adult Show Ticket includes 2 Drinks',
      'Comedy ticket plus 9" Pizza', 
      'OLD Groupon Offer (per person - extras are already included)',
      'Adult Comedy & Magic Show Ticket + 9" Pizza',
      'Adult Show Ticket includes 2 Drinks + 9" Pizza',
      'Adult Show Ticket includes 2 soft drinks',
      'Adult Show Ticket induces 2 soft drinks + 9" PIzza',
      'Adult Comedy Magic Show ticket',
      'Smoke Offer Ticket includes Drink (minimum x2)',
      'Groupon Magic & Pints Package (per person)',
      'Groupon Magic & Cocktails Package (per person)',
      'Wowcher Magic & Cocktails Package (per person)'
    ];
    
    // Debug: Log guest data to see what fields are available
    console.log('Checking ticket type for guest:', guest.booker_name, Object.keys(guest));
    
    // Find the ticket type and extract package info
    for (const field of ticketTypeFields) {
      const value = guest[field];
      console.log(`Checking field "${field}": value = "${value}"`);
      if (value && value !== '' && value !== '0' && parseInt(value) > 0) {
        console.log(`Found ticket type: ${field} with value: ${value}`);
        
        // Extract the package information from the field name
        let packageInfo = 'Show Ticket';
        
        if (field.includes('includes 2 Drinks + 9" Pizza') || field.includes('+ 9" Pizza')) {
          packageInfo = 'Show + 2 Drinks + 9" Pizza';
        } else if (field.includes('includes 2 Drinks')) {
          packageInfo = 'Show + 2 Drinks';
        } else if (field.includes('includes 2 soft drinks + 9" PIzza')) {
          packageInfo = 'Show + 2 Soft Drinks + 9" Pizza';
        } else if (field.includes('includes 2 soft drinks')) {
          packageInfo = 'Show + 2 Soft Drinks';
        } else if (field.includes('plus 9" Pizza')) {
          packageInfo = 'Show + 9" Pizza';
        } else if (field.includes('Magic & Pints Package')) {
          packageInfo = 'Magic Show + Pints';
        } else if (field.includes('Magic & Cocktails Package')) {
          packageInfo = 'Magic Show + Cocktails';
        } else if (field.includes('Comedy Magic Show')) {
          packageInfo = 'Comedy Magic Show';
        } else if (field.includes('Groupon') || field.includes('OLD Groupon')) {
          packageInfo = 'Groupon Package';
        } else if (field.includes('Smoke Offer')) {
          packageInfo = 'Show + Drinks (min x2)';
        }
        
        return packageInfo;
      }
    }
    
    return 'Show Ticket';
  };

  // Get all addon information for a guest
  const getAddons = (guest: Guest) => {
    if (!guest || typeof guest !== 'object') return [];
    
    const addons = [];
    
    // Addon fields
    const addonFields = [
      'Prosecco add on',
      'Bottle of Wine',
      'GlutenBase',
      'Salt & Pepper Fries',
      'Vegan'
    ];
    
    addonFields.forEach(field => {
      const value = guest[field];
      if (value && value !== '' && value !== '0') {
        addons.push(`${field}: ${value}`);
      }
    });
    
    return addons;
  };

  // Consolidate all notes for a booking group
  const getAllNotes = (booking: BookingGroup) => {
    const notes = [];
    
    // Main booking notes
    const mainGuest = booking.mainBooking;
    if (mainGuest.Note) notes.push(`Note: ${mainGuest.Note}`);
    if (mainGuest.Magic) notes.push(`Magic: ${mainGuest.Magic}`);
    if (mainGuest.DIET) notes.push(`Diet: ${mainGuest.DIET}`);
    if (mainGuest.Friends) notes.push(`Party: ${mainGuest.Friends}`);
    if (mainGuest.TERMS) notes.push(`Terms: ${mainGuest.TERMS}`);
    if (mainGuest.Booking) notes.push(`Occasion: ${mainGuest.Booking}`);
    
    // Add-on notes (if any)
    booking.addOns.forEach(addon => {
      if (addon.Note) notes.push(`Add-on Note: ${addon.Note}`);
      if (addon.Magic) notes.push(`Add-on Magic: ${addon.Magic}`);
    });
    
    return notes.filter(note => note && note.trim() !== '').join(' | ');
  };

  // Extract guest name from booker field
  const extractGuestName = (bookerName: string) => {
    if (!bookerName) return 'Unknown Guest';
    return bookerName.trim();
  };

  // Get show time from item field
  const getShowTime = (guest: Guest) => {
    if (!guest || typeof guest !== 'object') return 'Unknown';
    const itemField = guest.Item || guest.item_details || '';
    
    // Look for time patterns in square brackets like [7:00pm] or [9:00pm]
    const timeMatch = itemField.match(/\[(\d{1,2}:\d{2}(?:am|pm))\]/i);
    if (timeMatch) {
      return timeMatch[1];
    }
    
    // Fallback patterns
    if (itemField.includes('7:00pm') || itemField.includes('7pm')) return '7:00pm';
    if (itemField.includes('9:00pm') || itemField.includes('9pm')) return '9:00pm';
    if (itemField.includes('8:00pm') || itemField.includes('8pm')) return '8:00pm';
    
    return 'Unknown';
  };

  // Filter bookings based on search and show time
  const filteredBookings = useMemo(() => {
    const result = groupedBookings.filter((booking) => {
      if (!booking || !booking.mainBooking) return false;

      const guestName = extractGuestName(booking.mainBooking.booker_name || '');
      const showTime = getShowTime(booking.mainBooking);
      
      const matchesSearch = searchTerm === '' || 
        guestName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesShow = showFilter === 'all' || showTime === showFilter;
      
      return matchesSearch && matchesShow;
    });
    
    console.log(`Filtered bookings: ${result.length} from ${groupedBookings.length} total`);
    return result;
  }, [groupedBookings, searchTerm, showFilter]);

  // Get available pagers (not currently assigned)
  const getAvailablePagers = () => {
    const assignedPagers = new Set(Array.from(pagerAssignments.values()));
    return availablePagers.filter(pager => !assignedPagers.has(pager));
  };

  const assignPager = (guestIndex: number, pagerId: number) => {
    const newAssignments = new Map(pagerAssignments);
    newAssignments.set(guestIndex, pagerId);
    setPagerAssignments(newAssignments);
    
    const guest = guests[guestIndex];
    const guestName = extractGuestName(guest && guest.booker_name ? guest.booker_name : '');
    
    toast({
      title: "📟 Pager Assigned",
      description: `Pager ${pagerId} assigned to ${guestName}`,
    });
    
    setSelectedGuestForPager(null);
  };

  const bypassPager = (guestIndex: number) => {
    const guest = guests[guestIndex];
    const guestName = extractGuestName(guest && guest.booker_name ? guest.booker_name : '');
    
    toast({
      title: "✅ Pager Bypassed",
      description: `${guestName} seated without pager`,
    });
    
    setSelectedGuestForPager(null);
  };

  const handleCheckIn = (mainIndex: number) => {
    const newCheckedIn = new Set(checkedInGuests);
    const guest = guests[mainIndex];
    if (!guest) return;

    const guestName = extractGuestName(guest.booker_name || '');
    
    if (newCheckedIn.has(mainIndex)) {
      // Check out - remove pager assignment, allocated status and seated status
      newCheckedIn.delete(mainIndex);
      const newPagerAssignments = new Map(pagerAssignments);
      newPagerAssignments.delete(mainIndex);
      setPagerAssignments(newPagerAssignments);
      
      const newSeatedGuests = new Set(seatedGuests);
      newSeatedGuests.delete(mainIndex);
      setSeatedGuests(newSeatedGuests);
      
      const newAllocatedGuests = new Set(allocatedGuests);
      newAllocatedGuests.delete(mainIndex);
      setAllocatedGuests(newAllocatedGuests);

      const newGuestTableAllocations = new Map(guestTableAllocations);
      newGuestTableAllocations.delete(mainIndex);
      setGuestTableAllocations(newGuestTableAllocations);
      
      toast({
        title: "✅ Checked Out",
        description: `${guestName} has been checked out and pager freed.`,
      });
    } else {
      // Check in - need to assign pager
      newCheckedIn.add(mainIndex);
      setSelectedGuestForPager(mainIndex);
    }
    setCheckedInGuests(newCheckedIn);
  };

  const handleTableAssign = (tableId: number, guestName: string, guestCount: number, showTime: string) => {
    toast({
      title: "🪑 Table Assigned",
      description: `${guestName} (${guestCount} guests) assigned to Table ${tableId}`,
    });
  };

  const handlePagerRelease = (pagerNumber: number) => {
    // Find the guest with this pager and remove the assignment
    const newPagerAssignments = new Map(pagerAssignments);
    for (const [guestIndex, assignedPager] of pagerAssignments) {
      if (assignedPager === pagerNumber) {
        newPagerAssignments.delete(guestIndex);
        break;
      }
    }
    setPagerAssignments(newPagerAssignments);
    
    toast({
      title: "📟 Pager Released",
      description: `Pager ${pagerNumber} is now available`,
    });
  };

  const handleGuestSeated = (guestIndex: number) => {
    const newSeatedGuests = new Set(seatedGuests);
    newSeatedGuests.add(guestIndex);
    setSeatedGuests(newSeatedGuests);
    
    // Remove from allocated when seated
    const newAllocatedGuests = new Set(allocatedGuests);
    newAllocatedGuests.delete(guestIndex);
    setAllocatedGuests(newAllocatedGuests);
  };

  // New: Handle table allocation (not seated yet)
  const handleTableAllocated = (guestIndex: number, tableIds: number[]) => {
    const newAllocatedGuests = new Set(allocatedGuests);
    newAllocatedGuests.add(guestIndex);
    setAllocatedGuests(newAllocatedGuests);
    
    // Store the table allocation for this guest
    const newGuestTableAllocations = new Map(guestTableAllocations);
    newGuestTableAllocations.set(guestIndex, tableIds);
    setGuestTableAllocations(newGuestTableAllocations);
    
    const guest = guests[guestIndex];
    const guestName = extractGuestName(guest && guest.booker_name ? guest.booker_name : '');
    
    toast({
      title: "📍 Table Allocated",
      description: `${guestName} allocated to Table(s) ${tableIds.join(', ')}. Page when ready.`,
    });
  };

  const getShowTimeBadgeStyle = (showTime: string) => {
    if (showTime === '7:00pm' || showTime === '7pm') return 'bg-orange-100 text-orange-800 border-orange-200';
    if (showTime === '8:00pm' || showTime === '8pm') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (showTime === '9:00pm' || showTime === '9pm') return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Add function to get checked-in guests data for table allocation
  const getCheckedInGuestsData = (): CheckedInGuest[] => {
    return Array.from(checkedInGuests).map(guestIndex => {
      const guest = guests[guestIndex];
      if (!guest) return null;

      const guestName = extractGuestName(guest.booker_name || '');
      const totalQty = guest.total_quantity || 1;
      const showTime = getShowTime(guest);
      const pagerNumber = pagerAssignments.get(guestIndex);
      const hasBeenSeated = seatedGuests.has(guestIndex);
      const hasTableAllocated = allocatedGuests.has(guestIndex);
      
      return {
        name: guestName,
        count: totalQty,
        showTime: showTime,
        originalIndex: guestIndex,
        pagerNumber: pagerNumber,
        hasBeenSeated: hasBeenSeated,
        hasTableAllocated: hasTableAllocated
      };
    }).filter(Boolean) as CheckedInGuest[];
  };

  // Calculate total guests for filtered bookings (respects show filter)
  const getTotalGuestsCount = () => {
    return filteredBookings.reduce((total, booking) => {
      if (!booking || !booking.mainBooking) return total;
      const totalQty = booking.mainBooking.total_quantity || 1;
      return total + totalQty;
    }, 0);
  };

  // Calculate checked-in guests count for filtered bookings
  const getCheckedInGuestsCount = () => {
    return Array.from(checkedInGuests).reduce((total, guestIndex) => {
      if (guestIndex >= guests.length || !guests[guestIndex]) return total;
      
      const guest = guests[guestIndex];
      const showTime = getShowTime(guest);
      
      // Only count if matches current show filter
      const matchesShow = showFilter === 'all' || showTime === showFilter;
      if (!matchesShow) return total;
      
      const totalQty = guest.total_quantity || 1;
      return total + totalQty;
    }, 0);
  };

  // Calculate allocated guests count for filtered bookings
  const getAllocatedGuestsCount = () => {
    return Array.from(allocatedGuests).reduce((total, guestIndex) => {
      if (guestIndex >= guests.length || !guests[guestIndex]) return total;
      
      const guest = guests[guestIndex];
      const showTime = getShowTime(guest);
      
      // Only count if matches current show filter
      const matchesShow = showFilter === 'all' || showTime === showFilter;
      if (!matchesShow) return total;
      
      const totalQty = guest.total_quantity || 1;
      return total + totalQty;
    }, 0);
  };

  const getShowTimeStats = () => {
    const stats = { '7:00pm': 0, '8:00pm': 0, '9:00pm': 0, 'Unknown': 0 };
    
    groupedBookings.forEach(booking => {
      if (!booking || !booking.mainBooking) return;
      
      const showTime = getShowTime(booking.mainBooking);
      const totalQty = booking.mainBooking.total_quantity || 1;
      
      if (showTime === '7:00pm' || showTime === '7pm') {
        stats['7:00pm'] += totalQty;
      } else if (showTime === '8:00pm' || showTime === '8pm') {
        stats['8:00pm'] += totalQty;
      } else if (showTime === '9:00pm' || showTime === '9pm') {
        stats['9:00pm'] += totalQty;
      } else {
        stats['Unknown'] += totalQty;
      }
    });
    
    return stats;
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Debug info - remove this after fixing */}
      <div className="bg-yellow-50 p-4 rounded border">
        <h4 className="font-semibold text-sm">Debug Info:</h4>
        <p className="text-xs">Total Guests: {guests.length}</p>
        <p className="text-xs">Grouped Bookings: {groupedBookings.length}</p>
        <p className="text-xs">Filtered Bookings: {filteredBookings.length}</p>
        <p className="text-xs">Available pagers: {getAvailablePagers().length}/12</p>
        <p className="text-xs">Allocated guests: {allocatedGuests.size}</p>
        <p className="text-xs">Seated guests: {seatedGuests.size}</p>
        <div className="flex items-center space-x-2 mt-2">
          <Save className="h-4 w-4 text-green-600" />
          <span className="text-xs text-green-600">Last saved: {lastSaved.toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">🎭 Theatre Check-In</h2>
            <p className="text-gray-600 mt-1">Simple guest management with pager assignment</p>
          </div>
          <div className="flex items-center space-x-6 text-lg">
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-gray-700">{getTotalGuestsCount()}</span>
              <span className="text-gray-500">Total Guests</span>
            </div>
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-gray-700">{getCheckedInGuestsCount()}</span>
              <span className="text-gray-500">Checked In</span>
            </div>
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm">
              <MapPin className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-gray-700">{getAllocatedGuestsCount()}</span>
              <span className="text-gray-500">Allocated</span>
            </div>
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm">
              <Radio className="h-5 w-5 text-purple-600" />
              <span className="font-semibold text-gray-700">{getAvailablePagers().length}</span>
              <span className="text-gray-500">Pagers Free</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pager Assignment Dialog */}
      <Dialog open={selectedGuestForPager !== null} onOpenChange={() => setSelectedGuestForPager(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Pager</DialogTitle>
          </DialogHeader>
          {selectedGuestForPager !== null && (
            <div className="space-y-4">
              <p className="text-gray-700">
                Assign a pager to <strong>{extractGuestName(guests[selectedGuestForPager] && guests[selectedGuestForPager].booker_name ? guests[selectedGuestForPager].booker_name : '')}</strong>
              </p>
              
              <div className="space-y-3">
                <h4 className="font-medium">Available Pagers:</h4>
                <div className="grid grid-cols-4 gap-2">
                  {getAvailablePagers().map(pagerId => (
                    <Button
                      key={pagerId}
                      variant="outline"
                      onClick={() => assignPager(selectedGuestForPager, pagerId)}
                      className="h-12 text-lg font-bold"
                    >
                      #{pagerId}
                    </Button>
                  ))}
                </div>
                
                {getAvailablePagers().length === 0 && (
                  <p className="text-red-600 text-sm">No pagers available</p>
                )}
                
                <div className="pt-4 border-t">
                  <Button
                    variant="secondary"
                    onClick={() => bypassPager(selectedGuestForPager)}
                    className="w-full"
                  >
                    Bypass Pager (Seated Together)
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="checkin" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm">
          <TabsTrigger value="checkin" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            Check-In System
          </TabsTrigger>
          <TabsTrigger value="tables" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            Table Management
          </TabsTrigger>
          <TabsTrigger value="stats" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            Show Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checkin" className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex space-x-4 items-end">
              <div className="flex-1">
                <Label htmlFor="search" className="text-base font-medium text-gray-700">Search by Booker Name</Label>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by booker name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 text-base"
                  />
                </div>
              </div>
              <div className="w-80">
                <Label htmlFor="show-filter" className="text-base font-medium text-gray-700">Filter by Show Time</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={showFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setShowFilter('all')}
                    className="flex-1 text-sm"
                  >
                    All Shows
                  </Button>
                  <Button
                    variant={showFilter === '7:00pm' ? 'default' : 'outline'}
                    onClick={() => setShowFilter('7:00pm')}
                    className="flex-1 text-sm"
                  >
                    7pm Show
                  </Button>
                  <Button
                    variant={showFilter === '8:00pm' ? 'default' : 'outline'}
                    onClick={() => setShowFilter('8:00pm')}
                    className="flex-1 text-sm"
                  >
                    8pm Show
                  </Button>
                  <Button
                    variant={showFilter === '9:00pm' ? 'default' : 'outline'}
                    onClick={() => setShowFilter('9:00pm')}
                    className="flex-1 text-sm"
                  >
                    9pm Show
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold text-gray-700">Action</TableHead>
                  <TableHead className="font-semibold text-gray-700">Booking Code</TableHead>
                  <TableHead className="font-semibold text-gray-700">Booker Name</TableHead>
                  <TableHead className="font-semibold text-gray-700">Total Quantity</TableHead>
                  <TableHead className="font-semibold text-gray-700">Package</TableHead>
                  <TableHead className="font-semibold text-gray-700">Addons</TableHead>
                  <TableHead className="font-semibold text-gray-700">Show Time</TableHead>
                  <TableHead className="font-semibold text-gray-700">Pager</TableHead>
                  <TableHead className="font-semibold text-gray-700">Table</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => {
                  if (!booking || !booking.mainBooking) return null;

                  const isCheckedIn = checkedInGuests.has(booking.originalIndex);
                  const isSeated = seatedGuests.has(booking.originalIndex);
                  const isAllocated = allocatedGuests.has(booking.originalIndex);
                  const assignedPager = pagerAssignments.get(booking.originalIndex);
                  const allocatedTables = guestTableAllocations.get(booking.originalIndex) || [];
                  
                  const bookingCode = booking.mainBooking.booking_code || '';
                  const booker = extractGuestName(booking.mainBooking.booker_name || '');
                  const totalQty = booking.mainBooking.total_quantity || 1;
                  const packageInfo = getPackageInfo(booking.mainBooking);
                  const addons = getAddons(booking.mainBooking);
                  const showTime = getShowTime(booking.mainBooking);
                  const allNotes = getAllNotes(booking);
                  
                  return (
                    <TableRow key={booking.originalIndex} className={`${isSeated ? 'bg-green-50 border-green-200' : isAllocated ? 'bg-blue-50 border-blue-200' : isCheckedIn ? 'bg-yellow-50 border-yellow-200' : 'hover:bg-gray-50'} transition-colors`}>
                      <TableCell>
                        <Button
                          onClick={() => handleCheckIn(booking.originalIndex)}
                          variant={isCheckedIn ? "destructive" : "default"}
                          size="sm"
                          className={isCheckedIn ? "bg-red-500 hover:bg-red-600" : "bg-green-600 hover:bg-green-700"}
                          disabled={isSeated}
                        >
                          {isSeated ? '✅ Seated' : isCheckedIn ? '✓ Check Out' : 'Check In'}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm text-gray-700">
                          {bookingCode}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-gray-900">
                          {booker}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <span className="font-bold text-gray-900 text-xl">{totalQty}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="bg-purple-50 px-3 py-2 rounded-lg text-sm font-medium text-purple-800 border border-purple-200">
                          {packageInfo}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-gray-600 max-w-xs">
                          {addons.length > 0 ? (
                            <div className="space-y-1">
                              {addons.slice(0, 2).map((addon, idx) => (
                                <div key={idx} className="bg-green-50 px-2 py-1 rounded text-xs">
                                  {addon.length > 30 ? addon.substring(0, 30) + '...' : addon}
                                </div>
                              ))}
                              {addons.length > 2 && (
                                <div className="text-xs text-gray-500">+{addons.length - 2} more</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getShowTimeBadgeStyle(showTime)}`}>
                          {showTime}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          {assignedPager ? (
                            <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm font-bold">
                              #{assignedPager}
                            </div>
                          ) : isCheckedIn ? (
                            <div className="text-gray-500 text-sm">Bypassed</div>
                          ) : (
                            <div className="text-gray-400 text-sm">-</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          {allocatedTables.length > 0 ? (
                            <div className="space-y-1">
                              {allocatedTables.map((tableId, idx) => (
                                <div key={idx} className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-bold">
                                  T{tableId}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-400 text-sm">-</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          {isSeated ? (
                            <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-bold">
                              Seated
                            </div>
                          ) : isAllocated ? (
                            <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-bold flex items-center justify-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              Allocated
                            </div>
                          ) : isCheckedIn ? (
                            <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm font-bold">
                              Checked In
                            </div>
                          ) : (
                            <div className="text-gray-400 text-sm">Waiting</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600 max-w-xs">
                          {allNotes}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filteredBookings.length === 0 && (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="text-lg text-gray-500 mb-2">No bookings found</div>
                <div className="text-gray-400">Try adjusting your search or filter criteria</div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tables" className="space-y-6">
          <TableAllocation 
            onTableAssign={handleTableAssign} 
            checkedInGuests={getCheckedInGuestsData()}
            onPagerRelease={handlePagerRelease}
            onGuestSeated={handleGuestSeated}
            onTableAllocated={handleTableAllocated}
          />
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-600" />
                Show Times (Total Guests)
              </h3>
              <div className="space-y-3">
                {Object.entries(getShowTimeStats()).map(([time, guestCount]) => {
                  if (time === 'Unknown' && guestCount === 0) return null;
                  const bookingCount = groupedBookings.filter(booking => {
                    if (!booking || !booking.mainBooking) return false;
                    const showTime = getShowTime(booking.mainBooking);
                    return (time === '7:00pm' && (showTime === '7:00pm' || showTime === '7pm')) ||
                           (time === '8:00pm' && (showTime === '8:00pm' || showTime === '8pm')) ||
                           (time === '9:00pm' && (showTime === '9:00pm' || showTime === '9pm')) ||
                           (time === 'Unknown' && showTime !== '7:00pm' && showTime !== '7pm' && showTime !== '8:00pm' && showTime !== '8pm' && showTime !== '9:00pm' && showTime !== '9pm');
                  }).length;
                  
                  const totalGuests = Object.values(getShowTimeStats()).reduce((sum, count) => sum + count, 0);
                  const percentage = totalGuests > 0 ? Math.round((guestCount / totalGuests) * 100) : 0;
                  
                  return (
                    <div key={time} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="font-medium text-gray-700">{time} Show</span>
                      <div className="text-right">
                        <span className="font-bold text-gray-900">{guestCount}</span>
                        <span className="text-sm text-gray-500 ml-2">guests</span>
                        <div className="text-xs text-gray-400">({bookingCount} bookings, {percentage}%)</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                Check-In Progress
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                  <span className="font-medium text-gray-700">Checked In</span>
                  <span className="font-bold text-green-600 text-xl">{getCheckedInGuestsCount()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                  <span className="font-medium text-gray-700">Table Allocated</span>
                  <span className="font-bold text-blue-600 text-xl">{getAllocatedGuestsCount()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                  <span className="font-medium text-gray-700">Seated</span>
                  <span className="font-bold text-purple-600 text-xl">{seatedGuests.size}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                  <span className="font-medium text-gray-700">Waiting</span>
                  <span className="font-bold text-red-600 text-xl">{groupedBookings.length - getCheckedInGuestsCount()}</span>
                </div>
                <div className="text-center pt-4">
                  <div className="text-3xl font-bold text-gray-800">
                    {groupedBookings.length > 0 ? Math.round((getCheckedInGuestsCount() / groupedBookings.length) * 100) : 0}%
                  </div>
                  <div className="text-gray-600">Check-in Rate</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center">
                <Radio className="h-5 w-5 mr-2 text-purple-600" />
                Pager Status
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                  <span className="font-medium text-gray-700">In Use</span>
                  <span className="font-bold text-purple-600 text-xl">{pagerAssignments.size}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                  <span className="font-medium text-gray-700">Available</span>
                  <span className="font-bold text-green-600 text-xl">{getAvailablePagers().length}</span>
                </div>
                <div className="text-center pt-4">
                  <div className="text-3xl font-bold text-gray-800">12</div>
                  <div className="text-gray-600">Total Pagers</div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CheckInSystem;
