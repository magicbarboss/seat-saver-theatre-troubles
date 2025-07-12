import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Search, Users, CheckCircle, User, Clock, Layout, Plus, Radio, MapPin, Save, UserPlus, MessageSquare, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  showTimes: string[];
  guestListId: string;
}

interface BookingGroup {
  mainBooking: Guest;
  addOns: Guest[];
  originalIndex: number;
  addOnIndices: number[];
}

interface CheckedInGuest {
  guest: Guest;
  name: string;
  count: number;
  showTime: string;
  originalIndex: number;
  pagerNumber?: number;
  hasBeenSeated?: boolean;
  hasTableAllocated?: boolean;
  isWalkIn?: boolean;
}

interface PartyGroup {
  id: string;
  bookingIndices: number[];
  totalGuests: number;
  guestNames: string[];
  connectionType: 'mutual' | 'one-way';
}

const CheckInSystem = ({ guests, headers, showTimes, guestListId }: CheckInSystemProps) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(showTimes?.[0] || '7pm');
  const [checkedInGuests, setCheckedInGuests] = useState<Set<number>>(new Set());
  const [tableAssignments, setTableAssignments] = useState<Map<number, number>>(new Map());
  const [pagerAssignments, setPagerAssignments] = useState<Map<number, number>>(new Map()); // guestIndex -> pagerId
  const [seatedGuests, setSeatedGuests] = useState<Set<number>>(new Set()); // Track seated guests
  const [seatedSections, setSeatedSections] = useState<Set<string>>(new Set()); // Track seated sections for parties
  const [allocatedGuests, setAllocatedGuests] = useState<Set<number>>(new Set()); // Track guests with allocated tables
  const [guestTableAllocations, setGuestTableAllocations] = useState<Map<number, number[]>>(new Map()); // guestIndex -> tableIds
  const [availablePagers] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const [selectedGuestForPager, setSelectedGuestForPager] = useState<number | null>(null);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [isInitialized, setIsInitialized] = useState(false);
  const [partyGroups, setPartyGroups] = useState<Map<string, PartyGroup>>(new Map());
  const [bookingComments, setBookingComments] = useState<Map<number, string>>(new Map());
  const [sessionDate, setSessionDate] = useState<string>('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [walkInGuests, setWalkInGuests] = useState<Guest[]>([]); // Store walk-in guests

  // Initialize show filter to first show time on component mount
  useEffect(() => {
    if (showTimes && showTimes.length > 0 && !showTimes.includes(showFilter)) {
      setShowFilter(showTimes[0]);
      console.log(`Initializing show filter to: ${showTimes[0]}`);
    }
  }, [showTimes]);

  // Clear all data and start fresh
  const clearAllData = async () => {
    if (!user?.id) return;

    try {
      // Delete from Supabase
      await supabase
        .from('checkin_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('guest_list_id', guestListId)
        .eq('session_date', new Date().toISOString().split('T')[0]);

      // Clear local state
      setCheckedInGuests(new Set());
      setPagerAssignments(new Map());
      setSeatedGuests(new Set());
      setSeatedSections(new Set());
      setAllocatedGuests(new Set());
      setGuestTableAllocations(new Map());
      setPartyGroups(new Map());
      setBookingComments(new Map());
      setWalkInGuests([]);
      
      console.log(`🧹 SYSTEM RESET: All data cleared from Supabase and local state`);
      
      setSessionDate(new Date().toDateString());
      setShowClearDialog(false);
      
      toast({
        title: "🗑️ All Data Cleared",
        description: "Started fresh session for today",
      });
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: "Error",
        description: "Failed to clear data",
        variant: "destructive"
      });
    }
  };

  // Add refresh status function for syncing state
  const refreshStatus = () => {
    console.log('Refreshing status sync...');
    // Force a re-render by updating last saved time
    setLastSaved(new Date());
    
    toast({
      title: "🔄 Status Refreshed",
      description: "Table and guest statuses have been synchronized",
    });
  };

  // Load state from Supabase on component mount
  useEffect(() => {
    const loadState = async () => {
      if (!user?.id) {
        setIsInitialized(true);
        return;
      }

      try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('checkin_sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('guest_list_id', guestListId)
          .eq('session_date', today)
          .maybeSingle();

        if (error) {
          console.error('Error loading session:', error);
          setSessionDate(today);
          setIsInitialized(true);
          return;
        }

        if (data) {
          // Load state from Supabase with proper type conversions
          setCheckedInGuests(new Set(data.checked_in_guests || []));
          setPagerAssignments(new Map(
            Object.entries(data.pager_assignments || {}).map(([k, v]) => [parseInt(k), v as number])
          ));
          setSeatedGuests(new Set(data.seated_guests || []));
          setSeatedSections(new Set(data.seated_sections || []));
          setAllocatedGuests(new Set(data.allocated_guests || []));
          setGuestTableAllocations(new Map(
            Object.entries(data.guest_table_allocations || {}).map(([k, v]) => [parseInt(k), v as number[]])
          ));
          setPartyGroups(new Map(Object.entries(data.party_groups || {}) as [string, PartyGroup][]));
          setBookingComments(new Map(
            Object.entries(data.booking_comments || {}).map(([k, v]) => [parseInt(k), v as string])
          ));
          setWalkInGuests((data.walk_in_guests as Guest[]) || []);
          setSessionDate(today);
          
          console.log('Loaded saved state from Supabase:', data.updated_at);
          
          toast({
            title: "🔄 Today's Session Restored",
            description: `Previous data loaded from ${new Date(data.updated_at).toLocaleTimeString()}`,
          });
        } else {
          setSessionDate(today);
          toast({
            title: "🌅 New Session Started",
            description: "Starting fresh session for today",
          });
        }
      } catch (error) {
        console.error('Failed to load saved state:', error);
        setSessionDate(new Date().toISOString().split('T')[0]);
      }
      setIsInitialized(true);
    };

    loadState();
  }, [user?.id, guestListId]);

  // Auto-save to Supabase - separate effect that only runs after initialization
  useEffect(() => {
    if (!isInitialized || !user?.id) return;

    const saveState = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        const sessionData = {
          user_id: user.id,
          guest_list_id: guestListId,
          session_date: today,
          checked_in_guests: Array.from(checkedInGuests),
          seated_guests: Array.from(seatedGuests),
          seated_sections: Array.from(seatedSections),
          allocated_guests: Array.from(allocatedGuests),
          guest_table_allocations: Object.fromEntries(guestTableAllocations) as any,
          pager_assignments: Object.fromEntries(pagerAssignments) as any,
          party_groups: Object.fromEntries(partyGroups) as any,
          booking_comments: Object.fromEntries(bookingComments) as any,
          walk_in_guests: walkInGuests as any
        };

        const { error } = await supabase
          .from('checkin_sessions')
          .upsert(sessionData, {
            onConflict: 'user_id,guest_list_id,session_date'
          });

        if (error) {
          console.error('Error saving session:', error);
        } else {
          setLastSaved(new Date());
          console.log('Auto-saved state to Supabase at', new Date().toLocaleTimeString());
        }
      } catch (error) {
        console.error('Failed to save state to Supabase:', error);
      }
    };

    const interval = setInterval(saveState, 30000);
    return () => {
      clearInterval(interval);
      saveState();
    };
  }, [isInitialized, user?.id, guestListId, checkedInGuests, pagerAssignments, seatedGuests, seatedSections, allocatedGuests, guestTableAllocations, partyGroups, bookingComments, walkInGuests]);

  // Debug: Log headers to see what we're working with
  console.log('Available headers:', headers);
  console.log('Sample guest data:', guests[0]);
  console.log('All guests:', guests);

  // Extract guest name from booker field
  const extractGuestName = (bookerName: string) => {
    if (!bookerName) return 'Unknown Guest';
    return bookerName.trim();
  };

  // Helper function to get pizza information from guest data - UNIVERSAL DEBUG
  const getPizzaInfo = (guest: Guest): string => {
    const totalQty = guest.total_quantity || 1;
    const bookerName = guest.booker_name || 'UNKNOWN';
    
    // UNIVERSAL DEBUG - Log ALL guests to catch Kelly Foote
    console.log(`🍕 PIZZA CHECK for ${bookerName}:`, {
      booker_name: bookerName,
      total_quantity: totalQty,
      hasTicketData: !!guest.ticket_data,
      ticketDataType: typeof guest.ticket_data,
      ticketData: guest.ticket_data
    });
    
    if (!guest?.ticket_data || typeof guest.ticket_data !== 'object') {
      console.log(`❌ ${bookerName}: No valid ticket data`);
      return '';
    }
    
    // Check EVERY field for "pizza" (case insensitive)
    const allKeys = Object.keys(guest.ticket_data);
    console.log(`🔍 ${bookerName}: Checking ${allKeys.length} fields:`, allKeys);
    
    for (const key of allKeys) {
      const value = guest.ticket_data[key];
      console.log(`🔍 ${bookerName}: Field "${key}" = "${value}"`);
      
      if (key.toLowerCase().includes('pizza')) {
        console.log(`✅ ${bookerName}: FOUND PIZZA FIELD: "${key}" with value: "${value}"`);
        const result = `${totalQty} × Pizza`;
        console.log(`🍕 ${bookerName}: RETURNING: "${result}"`);
        return result;
      }
    }
    
    console.log(`❌ ${bookerName}: NO PIZZA FIELDS FOUND`);
    return '';
  };

  // Party detection logic - Fixed variable initialization
  const detectPartyConnections = useMemo(() => {
    if (!guests || guests.length === 0) return new Map<string, PartyGroup>();
    
    const connections = new Map<string, PartyGroup>();
    
    guests.forEach((guest, index) => {
      if (!guest || !guest.Friends) return;
      
      const friendsField = guest.Friends.toString().toLowerCase();
      const guestName = extractGuestName(guest.booker_name || '').toLowerCase();
      
      // Find other guests whose names are mentioned in this guest's Friends field
      guests.forEach((otherGuest, otherIndex) => {
        if (index === otherIndex || !otherGuest) return;
        
        const otherGuestName = extractGuestName(otherGuest.booker_name || '').toLowerCase();
        const otherFriendsField = otherGuest.Friends ? otherGuest.Friends.toString().toLowerCase() : '';
        
        // Check if guest mentions otherGuest
        if (friendsField.includes(otherGuestName) || otherFriendsField.includes(guestName)) {
          const partyId = [index, otherIndex].sort().join('-');
          
          if (!connections.has(partyId)) {
            const isMutual = friendsField.includes(otherGuestName) && otherFriendsField.includes(guestName);
            const totalGuests = (guest.total_quantity || 1) + (otherGuest.total_quantity || 1);
            
            connections.set(partyId, {
              id: partyId,
              bookingIndices: [index, otherIndex],
              totalGuests: totalGuests,
              guestNames: [
                extractGuestName(guest.booker_name || ''),
                extractGuestName(otherGuest.booker_name || '')
              ],
              connectionType: isMutual ? 'mutual' : 'one-way'
            });
          }
        }
      });
    });
    
    return connections;
  }, [guests]);

  // Update party groups when connections change
  useEffect(() => {
    setPartyGroups(detectPartyConnections);
  }, [detectPartyConnections]);

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

  // Simple package detection based on active field names
  const getPackageInfo = (guest: Guest) => {
    if (!guest || typeof guest !== 'object') return 'Show Ticket Only';
    
    // Look for active fields in guest.ticket_data to determine package
    if (guest.ticket_data && typeof guest.ticket_data === 'object') {
      const ticketData = guest.ticket_data as any;
      
      // Find fields with actual values (not empty or zero)
      for (const [field, value] of Object.entries(ticketData)) {
        if (value && String(value).trim() !== '' && String(value) !== '0') {
          // Return the field name as the package type - this shows what they actually ordered
          return field;
        }
      }
    }
    
    // Fallback to Show Ticket Only if no active fields found
    return 'Show Ticket Only';
  };

  // Simple package calculation based on header text parsing
  const calculatePackageQuantities = (packageInfo: string, guestCount: number) => {
    const quantities = [];
    
    // Parse header text directly to determine quantities
    // Show Tickets: Any header with "Show" or "Ticket" = 1 show per person
    if (packageInfo.includes('Show') || packageInfo.includes('Ticket')) {
      quantities.push(`${guestCount} Show Ticket${guestCount > 1 ? 's' : ''}`);
    }
    
    // Drinks: Extract number from headers like "2 Drinks"
    const drinkMatch = packageInfo.match(/(\d+)\s*(Drink|drink)/i);
    if (drinkMatch) {
      const drinksPerPerson = parseInt(drinkMatch[1]);
      const totalDrinks = drinksPerPerson * guestCount;
      const drinkType = packageInfo.includes('soft') ? 'Soft Drink Tokens' : 'Drink Tokens';
      quantities.push(`${totalDrinks} ${drinkType}`);
    }
    
    // Pizzas: Extract size and quantity from headers like "9 Pizza" or "9\" Pizza"
    const pizzaMatch = packageInfo.match(/(\d+)["']?\s*Pizza/i);
    if (pizzaMatch) {
      const pizzaSize = pizzaMatch[1];
      const totalPizzas = guestCount;
      quantities.push(`${totalPizzas} × ${pizzaSize}" Pizza${totalPizzas > 1 ? 's' : ''}`);
    }
    
    // Special packages: Display as-is
    if (packageInfo.includes('OLD Groupon')) {
      quantities.push('OLD Groupon Package');
    }
    
    // Return at least show tickets if nothing else found
    return quantities.length > 0 ? quantities : [`${guestCount} Show Ticket${guestCount > 1 ? 's' : ''}`];
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
      'Adult Show Ticket induces 2 soft drinks',
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

  // Simplified addon detection using only booking code grouping
  const getAddons = (guest: Guest, bookingGroup?: BookingGroup) => {
    if (!guest || typeof guest !== 'object') return [];
    
    const addons = [];
    let calculatedDrinks = 0;
    let proseccoCount = 0;
    
    const guestName = extractGuestName(guest.booker_name || '');
    console.log(`🔍 PROCESSING ${guestName}:`, {
      hasTicketData: !!guest.ticket_data,
      ticketData: guest.ticket_data,
      hasBookingGroup: !!bookingGroup,
      mainBooking: bookingGroup?.mainBooking
    });
    
    // First priority: Process main booking ticket data for drinks
    if (guest.ticket_data && typeof guest.ticket_data === 'object') {
      const ticketData = guest.ticket_data as { [key: string]: string };
      console.log(`🎫 Processing ticket_data for ${guestName}:`, ticketData);
      
      // Parse all ticket types and calculate drinks
      Object.entries(ticketData).forEach(([ticketType, quantity]) => {
        const qty = parseInt(quantity) || 0;
        
        // Check for various drink patterns in ticket names
        if (qty > 0 && (
          ticketType.includes('& 2 Drinks') || 
          ticketType.includes('includes 2 Drinks') ||
          ticketType.includes('+ 2 Drinks')
        )) {
          calculatedDrinks += qty * 2; // qty people × 2 drinks each
          console.log(`🍺 Found drinks for ${guestName}: ${qty}x 2 drinks = ${qty * 2} total drinks`);
        } else if (qty > 0 && (
          ticketType.includes('& 2 soft drinks') ||
          ticketType.includes('includes 2 soft drinks') ||
          ticketType.includes('+ 2 soft drinks')
        )) {
          calculatedDrinks += qty * 2; // qty people × 2 soft drinks each
          console.log(`🥤 Found soft drinks for ${guestName}: ${qty}x 2 drinks = ${qty * 2} total drinks`);
        }
      });
    } else if (bookingGroup?.mainBooking) {
      // Fallback: Parse main booking data directly when ticket_data is undefined
      const mainBooking = bookingGroup.mainBooking;
      console.log(`🔄 FALLBACK processing for ${guestName}:`, mainBooking);
      
      // Look for ticket columns in main booking and extract drinks
      Object.entries(mainBooking).forEach(([key, value]) => {
        console.log(`🔍 Checking key: "${key}" with value: "${value}"`);
        if (key.includes('House Magicians Show Ticket') && value && parseInt(value as string) > 0) {
          const qty = parseInt(value as string);
          console.log(`🎟️ Found ticket: ${key} with qty: ${qty}`);
          if (key.includes('& 2 Drinks') || key.includes('includes 2 Drinks') || key.includes('+ 2 Drinks')) {
            calculatedDrinks += qty * 2; // qty people × 2 drinks each
            console.log(`🍺 FALLBACK drinks for ${guestName}: ${qty}x 2 drinks = ${qty * 2} total drinks`);
          } else if (key.includes('& 2 soft drinks') || key.includes('includes 2 soft drinks') || key.includes('+ 2 soft drinks')) {
            calculatedDrinks += qty * 2; // qty people × 2 soft drinks each
            console.log(`🥤 FALLBACK soft drinks for ${guestName}: ${qty}x 2 drinks = ${qty * 2} total drinks`);
          }
        }
      });
    }
    
    // Add drinks to addons if found
    if (calculatedDrinks > 0) {
      addons.push(`${calculatedDrinks} Drinks`);
      console.log(`✅ Added ${calculatedDrinks} drinks to addons for ${guestName}`);
    } else {
      console.log(`❌ NO DRINKS FOUND for ${guestName}`);
    }
    
    // Process booking group addons if available
    if (bookingGroup && bookingGroup.addOns.length > 0) {
      // Process addon items
      bookingGroup.addOns.forEach(addon => {
        const itemDetails = addon.Item || addon.item_details || '';
        
        // Count Prosecco bottles using total_quantity
        if (itemDetails.toLowerCase().includes('prosecco')) {
          proseccoCount += addon.total_quantity || 1;
        } else {
          // General addon fallback - display any addon that's not prosecco
          const quantity = addon.total_quantity || 1;
          const price = addon.price || '';
          if (itemDetails) {
            if (price) {
              addons.push(`${quantity}x ${itemDetails} (${price})`);
            } else {
              addons.push(`${quantity}x ${itemDetails}`);
            }
          }
        }
      });
      
      // Add Prosecco addon if found
      if (proseccoCount > 0) {
        addons.push(`${proseccoCount} Btls Prosecco`);
      }
    }
    
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

  // Get show time from item field - UPDATED to normalize show times
  const getShowTime = (guest: Guest) => {
    if (!guest || typeof guest !== 'object') return 'Unknown';
    const itemField = guest.Item || guest.item_details || guest.show_time || '';
    
    // Look for time patterns in square brackets like [7:00pm] or [9:00pm]
    const timeMatch = itemField.match(/\[(\d{1,2}:\d{2}(?:am|pm))\]/i);
    if (timeMatch) {
      const time = timeMatch[1].toLowerCase();
      // Normalize to standard format
      if (time.includes('7:00pm') || time.includes('7pm')) return '7pm';
      if (time.includes('8:00pm') || time.includes('8pm')) return '8pm';
      if (time.includes('9:00pm') || time.includes('9pm')) return '9pm';
      return timeMatch[1];
    }
    
    // Fallback patterns - normalize to simple format
    if (itemField.includes('7:00pm') || itemField.includes('7pm')) return '7pm';
    if (itemField.includes('9:00pm') || itemField.includes('9pm')) return '9pm';
    if (itemField.includes('8:00pm') || itemField.includes('8pm')) return '8pm';
    
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
      
      const matchesShow = showTime === showFilter;
      
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

  const handleGuestSeated = (sectionInfo: { originalIndex: number; sectionId: string; guestCount: number }) => {
    const { originalIndex: guestIndex, sectionId, guestCount: sectionGuestCount } = sectionInfo;
    
    const guest = guestIndex >= 10000 ? walkInGuests[guestIndex - 10000] : guests[guestIndex];
    const guestName = extractGuestName(guest && guest.booker_name ? guest.booker_name : '');
    const totalQty = guest ? guest.total_quantity || 1 : 1;
    
    // ENHANCED DEBUG LOGGING FOR LARGE GROUPS
    console.log(`=== SEATING DEBUG START ===`);
    console.log(`Guest Index: ${guestIndex}, Section ID: ${sectionId}, Section Guest Count: ${sectionGuestCount}`);
    
    if (totalQty >= 10) {
      console.log(`🎯 LARGE GROUP SEATING - ${guestName} (${totalQty} guests):`, {
        sectionBeingSeated: sectionId,
        sectionGuestCount,
        currentStatus: {
          isAllocated: allocatedGuests.has(guestIndex),
          currentSeatedSections: Array.from(seatedSections).filter(id => id.startsWith(`${guestIndex}-`)),
          allocatedTables: guestTableAllocations.get(guestIndex) || []
        }
      });
    }
    
    const newSeatedGuests = new Set(seatedGuests);
    const newAllocatedGuests = new Set(allocatedGuests);
    const newPagerAssignments = new Map(pagerAssignments);
    
    // For section-specific seating, create a unique identifier for this seated section
    const sectionSeatedId = `${guestIndex}-${sectionId}`;
    const newSeatedSections = new Set(seatedSections);
    
    // CRITICAL VALIDATION: Only add to seatedSections if this is a legitimate seating action
    if (!sectionId || sectionId.trim() === '') {
      console.error(`🚨 INVALID SECTION ID: Cannot seat guest ${guestIndex} to empty section ID`);
      return;
    }
    
    // EXTRA VALIDATION: Ensure the guest is actually allocated before seating
    if (!allocatedGuests.has(guestIndex)) {
      console.error(`🚨 SEATING ERROR: Guest ${guestIndex} is not allocated, cannot seat them`);
      toast({
        title: "Seating Error", 
        description: `Cannot seat guest - they must be allocated first`,
        variant: "destructive"
      });
      return;
    }
    
    // EXTRA VALIDATION: Check if this section ID already exists
    if (seatedSections.has(sectionSeatedId)) {
      console.warn(`⚠️ Section ${sectionSeatedId} is already seated, skipping duplicate seating`);
      return;
    }
    
    newSeatedSections.add(sectionSeatedId);
    
    // CRITICAL FIX: Add guest to seatedGuests set immediately when they start being seated
    newSeatedGuests.add(guestIndex);
    
    console.log(`✅ VALID SEATING ACTION: Adding sectionSeatedId: ${sectionSeatedId}`);
    console.log(`✅ Added guest ${guestIndex} to seatedGuests set`);
    console.log(`Total seated sections for guest ${guestIndex}:`, Array.from(newSeatedSections).filter(id => id.startsWith(`${guestIndex}-`)));
    
    // IMPROVED: Check if ALL allocated sections for this guest are now seated
    const allocatedTables = guestTableAllocations.get(guestIndex) || [];
    const guestSeatedSections = Array.from(newSeatedSections)
      .filter(id => id.startsWith(`${guestIndex}-`));
    
    const isFullySeated = allocatedTables.length > 0 && guestSeatedSections.length >= allocatedTables.length;
    
    console.log(`Guest ${guestIndex} seating status:`, {
      allocatedTables: allocatedTables.length,
      seatedSections: guestSeatedSections.length,
      isFullySeated,
      seatedSectionIds: guestSeatedSections
    });
    
    // Enhanced logging for large groups
    if (totalQty >= 10) {
      console.log(`🎯 LARGE GROUP STATUS UPDATE - ${guestName}:`, {
        fullySeated: isFullySeated,
        willRemainInAllocation: !isFullySeated,
        nextStatus: isFullySeated ? 'REMOVED from allocation' : 'REMAINS in allocation'
      });
    }
    
    // FIXED: Only remove from allocated if ALL sections are seated
    if (isFullySeated) {
      newAllocatedGuests.delete(guestIndex);
      console.log(`✅ Guest ${guestIndex} is now fully seated and removed from allocation list`);
    } else {
      console.log(`⏳ Guest ${guestIndex} is partially seated but remains in allocation list`);
    }
    
    // Free up the pager when first section is seated (if they have one)
    const assignedPager = newPagerAssignments.get(guestIndex);
    if (assignedPager) {
      console.log(`📟 Releasing pager ${assignedPager} for guest section ${sectionSeatedId}`);
      newPagerAssignments.delete(guestIndex);
    }
    
    console.log(`=== SEATING DEBUG END ===`);
    
    setSeatedGuests(newSeatedGuests);
    setSeatedSections(newSeatedSections);
    setAllocatedGuests(newAllocatedGuests);
    setPagerAssignments(newPagerAssignments);
    
    toast({
      title: "🪑 Section Seated",
      description: `${guestName} section (${sectionGuestCount} guests) at ${sectionId} has been seated${assignedPager ? ` and pager ${assignedPager} is now available` : ''}${isFullySeated ? ' - Group fully seated!' : ' - More sections remaining'}`,
    });
  };

  // New: Handle table allocation (not seated yet)
  const handleTableAllocated = (guestIndex: number, tableIds: number[]) => {
    const guest = guestIndex >= 10000 ? walkInGuests[guestIndex - 10000] : guests[guestIndex];
    const guestName = extractGuestName(guest && guest.booker_name ? guest.booker_name : '');
    const totalQty = guest ? guest.total_quantity || 1 : 1;
    
    // ENHANCED DEBUG LOGGING FOR LARGE GROUP ALLOCATIONS
    console.log(`=== TABLE ALLOCATION DEBUG START ===`);
    console.log(`Allocating tables for Guest ${guestIndex} (${guestName}) - ${totalQty} guests to tables:`, tableIds);
    
    if (totalQty >= 10) {
      console.log(`🎯 LARGE GROUP ALLOCATION - ${guestName}:`, {
        guestCount: totalQty,
        allocatedTables: tableIds,
        tableCount: tableIds.length,
        wasAlreadyAllocated: allocatedGuests.has(guestIndex)
      });
    }
    
    const newAllocatedGuests = new Set(allocatedGuests);
    newAllocatedGuests.add(guestIndex);
    setAllocatedGuests(newAllocatedGuests);
    
    // Store the table allocation for this guest
    const newGuestTableAllocations = new Map(guestTableAllocations);
    newGuestTableAllocations.set(guestIndex, tableIds);
    setGuestTableAllocations(newGuestTableAllocations);
    
    // CRITICAL: Ensure allocation does NOT add to seatedSections and clear any existing ones
    const currentSeatedSections = Array.from(seatedSections).filter(id => id.startsWith(`${guestIndex}-`));
    if (currentSeatedSections.length > 0) {
      console.error(`🚨 CRITICAL BUG: seatedSections contains data for guest ${guestIndex} during allocation!`, currentSeatedSections);
      console.error(`Clearing these seated sections to fix premature seating status:`, currentSeatedSections);
      
      // Clear the problematic seated sections for this guest
      const cleanedSeatedSections = new Set(seatedSections);
      currentSeatedSections.forEach(sectionId => {
        cleanedSeatedSections.delete(sectionId);
      });
      setSeatedSections(cleanedSeatedSections);
    }
    
    console.log(`✅ Guest ${guestIndex} allocated to ${tableIds.length} tables and added to allocation tracking`);
    console.log(`Current seatedSections for this guest AFTER cleanup:`, Array.from(seatedSections).filter(id => id.startsWith(`${guestIndex}-`)));
    console.log(`=== TABLE ALLOCATION DEBUG END ===`);
    
    toast({
      title: "📍 Table Allocated",
      description: `${guestName} allocated to Table(s) ${tableIds.join(', ')}. Page when ready.`,
    });
  };

  // Add walk-in handler
  const handleAddWalkIn = (walkInData: { name: string; count: number; showTime: string; notes?: string }) => {
    const walkInIndex = 10000 + walkInGuests.length; // Start walk-ins at index 10000
    
    const newWalkIn: Guest = {
      id: `walkin-${Date.now()}`,
      booking_code: `WALKIN-${walkInIndex}`,
      booker_name: walkInData.name,
      total_quantity: walkInData.count,
      is_checked_in: true, // Walk-ins are checked in immediately
      pager_number: null,
      table_assignments: null,
      show_time: walkInData.showTime,
      notes: walkInData.notes || ''
    };
    
    const newWalkInGuests = [...walkInGuests, newWalkIn];
    setWalkInGuests(newWalkInGuests);
    console.log('🚶 Added walk-in guest:', newWalkIn, 'Walk-ins array:', newWalkInGuests);
    
    // Add to checked-in guests
    const newCheckedInGuests = new Set(checkedInGuests);
    newCheckedInGuests.add(walkInIndex);
    setCheckedInGuests(newCheckedInGuests);
    console.log('✅ Auto-checked in walk-in:', walkInIndex, 'Checked-in set:', Array.from(newCheckedInGuests));
    
    toast({
      title: "🚶 Walk-in Added",
      description: `${walkInData.name} (${walkInData.count} guests) checked in for ${walkInData.showTime} show`,
    });
  };

  const getShowTimeBadgeStyle = (showTime: string) => {
    if (showTime === '7pm') return 'bg-orange-100 text-orange-800 border-orange-200';
    if (showTime === '8pm') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (showTime === '9pm') return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Add function to get checked-in guests data for table allocation
  const getCheckedInGuestsData = (): CheckedInGuest[] => {
    const checkedInData = Array.from(checkedInGuests).map(guestIndex => {
      let guest: Guest | null = null;
      
      // Check if it's a walk-in (index >= 10000) or regular guest
      if (guestIndex >= 10000) {
        const walkInIndex = guestIndex - 10000;
        guest = walkInGuests[walkInIndex] || null;
        console.log('🚶 Processing walk-in:', guestIndex, 'Walk-in index:', walkInIndex, 'Guest found:', guest);
      } else {
        guest = guests[guestIndex] || null;
      }
      
      if (!guest) return null;

      const guestName = extractGuestName(guest.booker_name || '');
      const totalQty = guest.total_quantity || 1;
      const showTime = guest.show_time || getShowTime(guest);
      const pagerNumber = pagerAssignments.get(guestIndex);
      
      // FIXED: For large groups, check if ALL their allocated sections have been seated
      const allocatedTables = guestTableAllocations.get(guestIndex) || [];
      const seatedSectionsForGuest = Array.from(seatedSections)
        .filter(sectionId => sectionId.startsWith(`${guestIndex}-`));
      
      // Enhanced debugging for large groups (10+ guests)
      if (totalQty >= 10) {
        console.log(`🔍 LARGE GROUP DEBUG - Guest ${guestIndex} (${guestName}):`, {
          totalQty,
          allocatedTables: allocatedTables.length,
          seatedSections: seatedSectionsForGuest.length,
          seatedSectionIds: seatedSectionsForGuest,
          hasTableAllocated: allocatedGuests.has(guestIndex),
          traditionalSeated: seatedGuests.has(guestIndex)
        });
      }
      
      // CRITICAL FIX: Only mark as seated if traditional seating is used
      // Large groups should ONLY be marked seated via traditional seating (seatedGuests Set)
      // Section-based seating should NOT automatically mark large groups as seated
      const hasBeenSeated = seatedGuests.has(guestIndex);
      
      // ENHANCED debugging to catch and fix the premature seating issue
      if (totalQty >= 10) {
        console.log(`🔍 LARGE GROUP STATUS DEBUG - ${guestName}:`, {
          guestIndex,
          allocatedTablesCount: allocatedTables.length,
          allocatedTableIds: allocatedTables,
          seatedSectionsCount: seatedSectionsForGuest.length,
          seatedSectionIds: seatedSectionsForGuest,
          traditionalSeated: seatedGuests.has(guestIndex),
          calculatedHasBeenSeated: hasBeenSeated,
          isAllocated: allocatedGuests.has(guestIndex),
          willShowInAllocation: allocatedGuests.has(guestIndex) && !hasBeenSeated
        });
        
        // Additional validation: Check if seatedSections contains invalid entries
        if (seatedSectionsForGuest.length > 0 && !hasBeenSeated && allocatedTables.length > 0) {
          console.warn(`⚠️ POTENTIAL ISSUE: Guest ${guestIndex} has seated sections but should still be in allocation:`, {
            seatedSectionIds: seatedSectionsForGuest,
            shouldBeInAllocation: true,
            recommendation: 'Check if these seated sections are valid'
          });
        }
      }
      const hasTableAllocated = allocatedGuests.has(guestIndex);
      
      // Additional debugging for status changes
      if (totalQty >= 10 && (hasBeenSeated || hasTableAllocated)) {
        console.log(`🎯 LARGE GROUP STATUS - ${guestName}: allocated=${hasTableAllocated}, fullySeated=${hasBeenSeated}`);
      }
      
      return {
        guest: guest,
        name: guestName,
        count: totalQty,
        showTime: showTime,
        originalIndex: guestIndex,
        pagerNumber: pagerNumber,
        hasBeenSeated: hasBeenSeated,
        hasTableAllocated: hasTableAllocated,
        isWalkIn: guestIndex >= 10000
      };
    }).filter(Boolean) as CheckedInGuest[];

    // Add party groups to the checked-in data
    const partyData: CheckedInGuest[] = [];
    for (const [, party] of partyGroups) {
      const allCheckedIn = party.bookingIndices.every(index => checkedInGuests.has(index));
      if (allCheckedIn) {
        const firstGuest = guests[party.bookingIndices[0]];
        const showTime = getShowTime(firstGuest);
        const pagerNumber = pagerAssignments.get(party.bookingIndices[0]);
        
        // FIXED: For party groups, check if ALL party members are fully seated
        let totalAllocatedSections = 0;
        let totalSeatedSections = 0;
        
        party.bookingIndices.forEach(index => {
          const allocatedTables = guestTableAllocations.get(index) || [];
          const guestSeatedSections = Array.from(seatedSections)
            .filter((sectionId: string) => sectionId.startsWith(`${index}-`));
          totalAllocatedSections += allocatedTables.length;
          totalSeatedSections += guestSeatedSections.length;
        });
        
        // Enhanced debugging for large party groups
        if (party.totalGuests >= 10) {
          console.log(`🔍 LARGE PARTY DEBUG - ${party.guestNames.join(' & ')}:`, {
            totalGuests: party.totalGuests,
            memberCount: party.bookingIndices.length,
            totalAllocatedSections,
            totalSeatedSections,
            traditionalSeated: party.bookingIndices.some(index => seatedGuests.has(index))
          });
        }
        
        // FIXED: Only mark party as seated if ALL sections are seated OR any member uses traditional seating
        const hasBeenSeated = party.bookingIndices.some(index => seatedGuests.has(index)) ||
          (totalAllocatedSections > 0 && totalSeatedSections >= totalAllocatedSections);
        const hasTableAllocated = party.bookingIndices.some(index => allocatedGuests.has(index));

        partyData.push({
          guest: firstGuest,
          name: `${party.guestNames.join(' & ')} (Party)`,
          count: party.totalGuests,
          showTime: showTime,
          originalIndex: party.bookingIndices[0], // Use first guest's index as reference
          pagerNumber: pagerNumber,
          hasBeenSeated: hasBeenSeated,
          hasTableAllocated: hasTableAllocated,
          isWalkIn: false
        });

        // Remove individual entries for party members
        party.bookingIndices.forEach(index => {
          const individualIndex = checkedInData.findIndex(guest => guest.originalIndex === index);
          if (individualIndex !== -1) {
            checkedInData.splice(individualIndex, 1);
          }
        });
      }
    }

    const finalData = [...checkedInData, ...partyData];
    console.log('📊 All checked-in guests data:', finalData);
    console.log('🚶 Walk-ins in checked-in data:', finalData.filter(g => g.isWalkIn));
    
    return finalData;
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
      const matchesShow = showTime === showFilter;
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
      const matchesShow = showTime === showFilter;
      if (!matchesShow) return total;
      
      const totalQty = guest.total_quantity || 1;
      return total + totalQty;
    }, 0);
  };

  const getShowTimeStats = () => {
    const stats = { '7pm': 0, '8pm': 0, '9pm': 0, 'Unknown': 0 };
    
    groupedBookings.forEach(booking => {
      if (!booking || !booking.mainBooking) return;
      
      const showTime = getShowTime(booking.mainBooking);
      const totalQty = booking.mainBooking.total_quantity || 1;
      
      if (showTime === '7pm') {
        stats['7pm'] += totalQty;
      } else if (showTime === '8pm') {
        stats['8pm'] += totalQty;
      } else if (showTime === '9pm') {
        stats['9pm'] += totalQty;
      } else {
        stats['Unknown'] += totalQty;
      }
    });
    
    return stats;
  };

  const handleCommentChange = (guestIndex: number, comment: string) => {
    const newComments = new Map(bookingComments);
    if (comment.trim() === '') {
      newComments.delete(guestIndex);
    } else {
      newComments.set(guestIndex, comment);
    }
    setBookingComments(newComments);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Session Management Controls */}
      <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-semibold text-sm text-yellow-800">Session Information</h4>
            <p className="text-xs text-yellow-700">
              Current session: {sessionDate} | Last saved: {lastSaved.toLocaleTimeString()}
            </p>
            <p className="text-xs text-yellow-600">
              Total Guests: {guests.length} | Grouped Bookings: {groupedBookings.length} | 
              Checked In: {checkedInGuests.size} | Seated: {seatedGuests.size}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshStatus}
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Refresh Status
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearDialog(true)}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear All Data
            </Button>
          </div>
        </div>
      </div>

      {/* Clear Data Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Clear All Session Data
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-700">
              This will clear all check-in data, pager assignments, table allocations, and comments for the current session.
            </p>
            <div className="bg-red-50 p-3 rounded border border-red-200">
              <p className="text-red-800 text-sm font-medium">
                ⚠️ This action cannot be undone!
              </p>
              <p className="text-red-700 text-sm">
                All guests will appear as not checked in and all pagers will be available.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowClearDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={clearAllData}>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All Data
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">🎭 Theatre Check-In</h2>
            <p className="text-gray-600 mt-1">Simple guest management with pager assignment</p>
            {/* DEBUG: Visual display of seated sections */}
            {seatedSections.size > 0 && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <strong>DEBUG - Seated Sections ({seatedSections.size}):</strong> {Array.from(seatedSections).join(', ')}
              </div>
            )}
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
              <div className="w-72">
                <Label htmlFor="show-filter" className="text-base font-medium text-gray-700">Filter by Show Time</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={showFilter === '7pm' ? 'default' : 'outline'}
                    onClick={() => setShowFilter('7pm')}
                    className="flex-1 text-sm"
                  >
                    7pm
                  </Button>
                  <Button
                    variant={showFilter === '8pm' ? 'default' : 'outline'}
                    onClick={() => setShowFilter('8pm')}
                    className="flex-1 text-sm"
                  >
                    8pm
                  </Button>
                  <Button
                    variant={showFilter === '9pm' ? 'default' : 'outline'}
                    onClick={() => setShowFilter('9pm')}
                    className="flex-1 text-sm"
                  >
                    9pm
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
                  <TableHead className="font-semibold text-gray-700">Booker Name</TableHead>
                  <TableHead className="font-semibold text-gray-700">Total Quantity</TableHead>
                  <TableHead className="font-semibold text-gray-700 min-w-[200px]">Package & Totals</TableHead>
                  <TableHead className="font-semibold text-gray-700">Pizzas</TableHead>
                  <TableHead className="font-semibold text-gray-700">Addons</TableHead>
                  <TableHead className="font-semibold text-gray-700">Show Time</TableHead>
                  <TableHead className="font-semibold text-gray-700">Pager</TableHead>
                  <TableHead className="font-semibold text-gray-700">Table</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700 w-96 min-w-96">Notes</TableHead>
                  <TableHead className="font-semibold text-gray-700">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      Comments
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => {
                  if (!booking || !booking.mainBooking) return null;

                  const isCheckedIn = checkedInGuests.has(booking.originalIndex);
                  // Use section-based seating logic instead of simple seatedGuests check
                  const isSeated = (() => {
                    const allocatedTables = guestTableAllocations.get(booking.originalIndex) || [];
                    if (allocatedTables.length === 0) return false;
                    
                    // Check how many sections for this guest have been seated
                    // seatedSections format: "${guestIndex}-${sectionId}"
                    const guestSeatedSections = Array.from(seatedSections)
                      .filter(sectionId => sectionId.startsWith(`${booking.originalIndex}-`));
                    
                    // DEBUG: Log seating status check for debugging
                    if (guestSeatedSections.length > 0) {
                      console.log(`Guest ${booking.originalIndex} (${booking.mainBooking.booker_name}) has seated sections:`, guestSeatedSections);
                    }
                    
                    // For now, consider a guest seated if they have any seated sections
                    // This will show progress and avoid the "Page when ready!" for partially seated guests
                    return guestSeatedSections.length > 0;
                  })();
                  const isAllocated = allocatedGuests.has(booking.originalIndex);
                  const assignedPager = pagerAssignments.get(booking.originalIndex);
                  const allocatedTables = guestTableAllocations.get(booking.originalIndex) || [];
                  const partyGroup = (() => {
                    for (const [, party] of partyGroups) {
                      if (party.bookingIndices.includes(booking.originalIndex)) {
                        return party;
                      }
                    }
                    return null;
                  })();
                  const currentComment = bookingComments.get(booking.originalIndex) || '';
                  
                  const booker = extractGuestName(booking.mainBooking.booker_name || '');
                  const totalQty = booking.mainBooking.total_quantity || 1;
                  const packageInfo = getPackageInfo(booking.mainBooking);
                  const packageQuantities = calculatePackageQuantities(packageInfo, totalQty);
                  const pizzaInfo = getPizzaInfo(booking.mainBooking);
                  const addons = getAddons(booking.mainBooking, booking);
                  const showTime = getShowTime(booking.mainBooking);
                  const allNotes = getAllNotes(booking);
                  
                  return (
                    <TableRow key={booking.originalIndex} className={`${isSeated ? 'bg-green-50 border-green-200' : isAllocated ? 'bg-blue-50 border-blue-200' : isCheckedIn ? 'bg-yellow-50 border-yellow-200' : partyGroup ? 'bg-pink-50 border-pink-200' : 'hover:bg-gray-50'} transition-colors`}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Button
                            onClick={() => handleCheckIn(booking.originalIndex)}
                            variant={isCheckedIn ? "destructive" : "default"}
                            size="sm"
                            className={isCheckedIn ? "bg-red-500 hover:bg-red-600" : "bg-green-600 hover:bg-green-700"}
                            disabled={isSeated}
                          >
                            {isSeated ? '✅ Seated' : isCheckedIn ? '✓ Check Out' : 'Check In'}
                          </Button>
                          {partyGroup && (
                            <Button
                              onClick={() => {
                                let allCheckedIn = true;
                                partyGroup.bookingIndices.forEach(index => {
                                  if (!checkedInGuests.has(index)) {
                                    allCheckedIn = false;
                                  }
                                });
                                if (allCheckedIn) {
                                  // Check out entire party
                                  const newCheckedIn = new Set(checkedInGuests);
                                  const newPagerAssignments = new Map(pagerAssignments);
                                  const newSeatedGuests = new Set(seatedGuests);
                                  const newAllocatedGuests = new Set(allocatedGuests);
                                  const newGuestTableAllocations = new Map(guestTableAllocations);

                                  partyGroup.bookingIndices.forEach(index => {
                                    newCheckedIn.delete(index);
                                    newPagerAssignments.delete(index);
                                    newSeatedGuests.delete(index);
                                    newAllocatedGuests.delete(index);
                                    newGuestTableAllocations.delete(index);
                                  });

                                  setCheckedInGuests(newCheckedIn);
                                  setPagerAssignments(newPagerAssignments);
                                  setSeatedGuests(newSeatedGuests);
                                  setAllocatedGuests(newAllocatedGuests);
                                  setGuestTableAllocations(newGuestTableAllocations);

                                  toast({
                                    title: "✅ Party Checked Out",
                                    description: `${partyGroup.guestNames.join(' & ')} party (${partyGroup.totalGuests} guests) checked out`,
                                  });
                                } else {
                                  // Check in entire party
                                  const newCheckedIn = new Set(checkedInGuests);
                                  partyGroup.bookingIndices.forEach(index => {
                                    newCheckedIn.add(index);
                                  });
                                  setCheckedInGuests(newCheckedIn);
                                  
                                  // Assign pager to first guest in party
                                  setSelectedGuestForPager(partyGroup.bookingIndices[0]);
                                  
                                  toast({
                                    title: "🎉 Party Checked In",
                                    description: `${partyGroup.guestNames.join(' & ')} party (${partyGroup.totalGuests} guests) checked in together`,
                                  });
                                }
                              }}
                              variant="outline"
                              size="sm"
                              className="text-xs bg-pink-100 hover:bg-pink-200 border-pink-300"
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Party ({partyGroup.totalGuests})
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-gray-900">
                          {booker}
                          {partyGroup && (
                            <div className="text-xs text-pink-600 font-medium mt-1">
                              🔗 Connected to: {partyGroup.guestNames.filter(name => name !== booker).join(', ')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <span className="font-bold text-gray-900 text-xl">{totalQty}</span>
                          {partyGroup && (
                            <div className="text-xs text-pink-600 font-medium">
                              Party: {partyGroup.totalGuests}
                            </div>
                          )}
                        </div>
                      </TableCell>
                       <TableCell className="min-w-[200px]">
                        <div className="space-y-2">
                          {(() => {
                            const guestName = extractGuestName(booker).toLowerCase();
                            if (guestName.includes('ewan')) {
                              console.log('=== UI RENDERING DEBUG FOR EWAN ===');
                              console.log('packageQuantities:', packageQuantities);
                              console.log('Array.isArray(packageQuantities):', Array.isArray(packageQuantities));
                              console.log('packageQuantities.length:', packageQuantities?.length);
                              console.log('typeof packageQuantities[0]:', typeof packageQuantities?.[0]);
                              console.log('Will render mixed tickets?', Array.isArray(packageQuantities) && packageQuantities.length > 0 && typeof packageQuantities[0] === 'object');
                            }
                            return null;
                          })()}
                          {Array.isArray(packageQuantities) && packageQuantities.length > 0 && typeof packageQuantities[0] === 'object' ? (
                            // Mixed ticket types - display multiple boxes
                            packageQuantities.map((pkg: any, idx: number) => (
                              <div key={idx} className="bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
                                <div className="text-sm font-medium text-purple-800 mb-1">
                                  {pkg.type}
                                </div>
                                <div className="space-y-1">
                                  {pkg.quantities.map((quantity: string, qIdx: number) => (
                                    <div key={qIdx} className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded">
                                      {quantity}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                          ) : (
                            // Single ticket type - display single box
                            <div className="bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
                              <div className="text-sm font-medium text-purple-800 mb-1">
                                {typeof packageInfo === 'string' ? packageInfo : 'Mixed Tickets'}
                              </div>
                              <div className="space-y-1">
                                {(packageQuantities as string[]).map((quantity, idx) => (
                                  <div key={idx} className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded">
                                    {quantity}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          {pizzaInfo ? (
                            <div className="bg-orange-50 px-3 py-2 rounded-lg border border-orange-200">
                              <span className="text-sm font-semibold text-orange-800">{pizzaInfo}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No Pizzas</span>
                          )}
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
                      <TableCell className="w-96 min-w-96">
                        <div className="text-sm text-gray-600">
                          {allNotes}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-40">
                          <Textarea
                            placeholder="Add comments..."
                            value={currentComment}
                            onChange={(e) => handleCommentChange(booking.originalIndex, e.target.value)}
                            className="min-h-[60px] text-xs resize-none"
                            rows={2}
                          />
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
            currentShowTime={showFilter}
            onAddWalkIn={handleAddWalkIn}
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
                    return (time === '7pm' && (showTime === '7pm' || showTime === '7pm')) ||
                           (time === '8pm' && (showTime === '8pm' || showTime === '8pm')) ||
                           (time === '9pm' && (showTime === '9pm' || showTime === '9pm'));
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
                <div className="flex justify-between items-center p-3 bg-pink-50 rounded">
                  <span className="font-medium text-gray-700">Party Connections</span>
                  <span className="font-bold text-pink-600 text-xl">{partyGroups.size}</span>
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
