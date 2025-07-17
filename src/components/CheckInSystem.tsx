import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import TableAllocation from './TableAllocation';
import { ErrorBoundary } from './ErrorBoundary';
import { SearchAndFilters } from './checkin/SearchAndFilters';
import { CheckInStats } from './checkin/CheckInStats';
import { CheckInActions } from './checkin/CheckInActions';
import { WalkInGuestForm } from './checkin/WalkInGuestForm';
import { GuestTable } from './checkin/GuestTable';

import { Guest, CheckInSystemProps, BookingGroup, PartyGroup } from './checkin/types';
const CheckInSystem = ({
  guests,
  headers,
  showTimes,
  guestListId
}: CheckInSystemProps) => {
  const {
    user
  } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(showTimes?.[0] || '7pm');
  const [checkedInGuests, setCheckedInGuests] = useState<Set<number>>(new Set());
  const [tableAssignments, setTableAssignments] = useState<Map<number, number>>(new Map());
  const [pagerAssignments, setPagerAssignments] = useState<Map<number, number>>(new Map());
  const [seatedGuests, setSeatedGuests] = useState<Set<number>>(new Set());
  const [seatedSections, setSeatedSections] = useState<Set<string>>(new Set());
  const [allocatedGuests, setAllocatedGuests] = useState<Set<number>>(new Set());
  const [guestTableAllocations, setGuestTableAllocations] = useState<Map<number, number[]>>(new Map());
  const [availablePagers] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  const [selectedGuestForPager, setSelectedGuestForPager] = useState<number | null>(null);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [isInitialized, setIsInitialized] = useState(false);
  const [partyGroups, setPartyGroups] = useState<Map<string, PartyGroup>>(new Map());
  const [friendshipGroups, setFriendshipGroups] = useState<Map<string, number[]>>(new Map());
  const [bookingComments, setBookingComments] = useState<Map<number, string>>(new Map());
  const [sessionDate, setSessionDate] = useState<string>('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [walkInGuests, setWalkInGuests] = useState<Guest[]>([]);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedGuestForComment, setSelectedGuestForComment] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');

  // Initialize show filter
  useEffect(() => {
    if (showTimes && showTimes.length > 0 && !showTimes.includes(showFilter)) {
      setShowFilter(showTimes[0]);
    }
  }, [showTimes, showFilter]);

  // Clear all data function
  const clearAllData = async () => {
    if (!user?.id) return;
    try {
      await supabase.from('checkin_sessions').delete().eq('user_id', user.id).eq('guest_list_id', guestListId).eq('session_date', new Date().toISOString().split('T')[0]);
      setCheckedInGuests(new Set());
      setPagerAssignments(new Map());
      setSeatedGuests(new Set());
      setSeatedSections(new Set());
      setAllocatedGuests(new Set());
      setGuestTableAllocations(new Map());
      setPartyGroups(new Map());
      setFriendshipGroups(new Map());
      setBookingComments(new Map());
      setWalkInGuests([]);
      setSessionDate(new Date().toDateString());
      setShowClearDialog(false);
      toast({
        title: "🗑️ All Data Cleared",
        description: "Started fresh session for today"
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

  // Refresh status function
  const refreshStatus = () => {
    setLastSaved(new Date());
    toast({
      title: "🔄 Status Refreshed",
      description: "Table and guest statuses have been synchronized"
    });
  };

  // Migrate session data from another guest list to current one by matching booking codes
  const migrateSessionData = async (fromSession: any, currentGuests: Guest[]) => {
    // First, we need to get the old guest list to match booking codes properly
    try {
      const {
        data: oldGuests
      } = await supabase.from('guests').select('*').eq('guest_list_id', fromSession.guest_list_id).order('original_row_index');
      if (!oldGuests || oldGuests.length === 0) {
        console.log('No old guests found for migration');
        return;
      }

      // Create mapping from booking_code to original index in old list
      const oldGuestsByBookingCode = new Map<string, number>();
      oldGuests.forEach((guest, index) => {
        if (guest.booking_code && guest.booker_name) {
          const key = `${guest.booking_code}_${guest.booker_name}`;
          oldGuestsByBookingCode.set(key, index);
        }
      });

      // Migrate data for matching guests
      const migratedCheckedIn = new Set<number>();
      const migratedPagers = new Map<number, number>();
      const migratedSeated = new Set<number>();
      const migratedAllocated = new Set<number>();
      const migratedTableAllocations = new Map<number, number[]>();
      const migratedComments = new Map<number, string>();
      const oldCheckedIn = fromSession.checked_in_guests || [];
      const oldPagerAssignments = fromSession.pager_assignments || {};
      const oldSeated = fromSession.seated_guests || [];
      const oldAllocated = fromSession.allocated_guests || [];
      const oldTableAllocations = fromSession.guest_table_allocations || {};
      const oldComments = fromSession.booking_comments || {};

      // Match current guests with old guests by booking code + booker name
      currentGuests.forEach((guest, currentIndex) => {
        if (!guest.booking_code || !guest.booker_name) return;
        const key = `${guest.booking_code}_${guest.booker_name}`;
        const oldIndex = oldGuestsByBookingCode.get(key);
        if (oldIndex !== undefined) {
          // Migrate data from old index to current index
          if (oldCheckedIn.includes(oldIndex)) {
            migratedCheckedIn.add(currentIndex);
          }
          if (oldSeated.includes(oldIndex)) {
            migratedSeated.add(currentIndex);
          }
          if (oldAllocated.includes(oldIndex)) {
            migratedAllocated.add(currentIndex);
          }
          if (oldPagerAssignments[oldIndex]) {
            migratedPagers.set(currentIndex, oldPagerAssignments[oldIndex]);
          }
          if (oldTableAllocations[oldIndex]) {
            migratedTableAllocations.set(currentIndex, oldTableAllocations[oldIndex]);
          }
          if (oldComments[oldIndex]) {
            migratedComments.set(currentIndex, oldComments[oldIndex]);
          }
        }
      });

      // Apply migrated data
      setCheckedInGuests(migratedCheckedIn);
      setPagerAssignments(migratedPagers);
      setSeatedGuests(migratedSeated);
      setAllocatedGuests(migratedAllocated);
      setGuestTableAllocations(migratedTableAllocations);
      setBookingComments(migratedComments);

      // Reset other data
      setSeatedSections(new Set());
      setPartyGroups(new Map());
      setFriendshipGroups(new Map());
      setWalkInGuests([]);
      setSessionDate(new Date().toISOString().split('T')[0]);
      console.log(`Migrated data for ${migratedCheckedIn.size} checked-in guests, ${migratedSeated.size} seated guests`);
    } catch (error) {
      console.error('Error during migration:', error);
    }
  };

  // Load state from Supabase with smart migration for guest list changes
  useEffect(() => {
    if (!user?.id || !guestListId || !guests || guests.length === 0) {
      if (user?.id && guestListId) {
        setIsInitialized(true);
        setSessionDate(new Date().toISOString().split('T')[0]);
      }
      return;
    }
    let isCancelled = false;
    const loadState = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];

        // Try to load session for this specific guest list
        const {
          data: currentSession,
          error
        } = await supabase.from('checkin_sessions').select('*').eq('user_id', user.id).eq('guest_list_id', guestListId).eq('session_date', today).maybeSingle();
        if (isCancelled) return;
        if (error) {
          console.error('Error loading session:', error);
          setSessionDate(today);
          setIsInitialized(true);
          return;
        }
        if (currentSession) {
          // Session exists for this guest list, restore it
          setCheckedInGuests(new Set(currentSession.checked_in_guests || []));
          setPagerAssignments(new Map(Object.entries(currentSession.pager_assignments || {}).map(([k, v]) => [parseInt(k), v as number])));
          setSeatedGuests(new Set(currentSession.seated_guests || []));
          setSeatedSections(new Set(currentSession.seated_sections || []));
          setAllocatedGuests(new Set(currentSession.allocated_guests || []));
          setGuestTableAllocations(new Map(Object.entries(currentSession.guest_table_allocations || {}).map(([k, v]) => [parseInt(k), v as number[]])));
          setPartyGroups(new Map(Object.entries(currentSession.party_groups || {}) as [string, PartyGroup][]));
          setFriendshipGroups(new Map(Object.entries((currentSession as any).friendship_groups || {}).map(([k, v]) => [k, v as number[]])));
          setBookingComments(new Map(Object.entries(currentSession.booking_comments || {}).map(([k, v]) => [parseInt(k), v as string])));
          setWalkInGuests(currentSession.walk_in_guests as Guest[] || []);
          setSessionDate(today);
          const savedDataCount = (currentSession.checked_in_guests || []).length;
          if (savedDataCount > 0) {
            toast({
              title: "🔄 Session Restored",
              description: `Previous data loaded from ${new Date(currentSession.updated_at).toLocaleTimeString()}`
            });
          }
        } else {
          // No session for this guest list, check if we can migrate from other sessions
          const {
            data: otherSessions
          } = await supabase.from('checkin_sessions').select('*').eq('user_id', user.id).eq('session_date', today).neq('guest_list_id', guestListId);
          if (isCancelled) return;
          if (otherSessions && otherSessions.length > 0) {
            // Try to migrate data from the most recent session
            const mostRecentSession = otherSessions.reduce((latest, session) => new Date(session.updated_at) > new Date(latest.updated_at) ? session : latest);
            await migrateSessionData(mostRecentSession, guests);

            // Only show migration toast if data was actually migrated
            const migratedCount = (mostRecentSession.checked_in_guests || []).length;
            if (migratedCount > 0) {
              toast({
                title: "📋 Data Migrated",
                description: "Check-in data migrated from previous guest list for matching guests"
              });
            }
          } else {
            setSessionDate(today);
          }
        }
      } catch (error) {
        console.error('Failed to load saved state:', error);
        setSessionDate(new Date().toISOString().split('T')[0]);
      }
      if (!isCancelled) {
        setIsInitialized(true);
      }
    };
    loadState();
    return () => {
      isCancelled = true;
    };
  }, [user?.id, guestListId, guests?.length]);

  // Auto-save to Supabase
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
          friendship_groups: Object.fromEntries(friendshipGroups) as any,
          booking_comments: Object.fromEntries(bookingComments) as any,
          walk_in_guests: walkInGuests as any
        };
        const {
          error
        } = await supabase.from('checkin_sessions').upsert(sessionData, {
          onConflict: 'user_id,guest_list_id,session_date'
        });
        if (!error) {
          setLastSaved(new Date());
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
  }, [isInitialized, user?.id, guestListId, checkedInGuests, pagerAssignments, seatedGuests, seatedSections, allocatedGuests, guestTableAllocations, partyGroups, friendshipGroups, bookingComments, walkInGuests]);

  // Extract guest name utility
  const extractGuestName = (bookerName: string) => {
    if (!bookerName) return 'Unknown Guest';
    return bookerName.trim();
  };

  // Enhanced ticket type mapping with perCouple support
  const TICKET_TYPE_MAPPING: Record<string, {
    drinks?: {
      type: string;
      quantity: number;
      perPerson?: boolean;
    };
    pizza?: {
      quantity: number;
      perCouple?: boolean;
    };
    fries?: {
      quantity: number;
      perCouple?: boolean;
    };
    prosecco?: {
      quantity: number;
      perPerson?: boolean;
    };
    extras?: string[];
    minimum_people?: number;
  }> = {
    // Standard House Magicians tickets
    'House Magicians Show Ticket': {
      // Basic show ticket - show only unless GYG/Viator detected
    },
    'House Magicians Show Ticket & 2 Drinks': {
      drinks: {
        type: 'drinks',
        quantity: 2,
        perPerson: true
      }
    },
    'House Magicians Show Ticket includes 2 Drinks +  1 Pizza': {
      drinks: {
        type: 'drinks',
        quantity: 2,
        perPerson: false
      },
      pizza: {
        quantity: 1,
        perCouple: false
      }
    },
    'House Magicians Show Ticket & 1 Pizza': {
      pizza: {
        quantity: 1,
        perCouple: true
      }
    },
    'House Magicians Show Ticket includes 2 Drinks + 1 Pizza': {
      drinks: {
        type: 'drinks',
        quantity: 2,
        perPerson: false
      },
      pizza: {
        quantity: 1,
        perCouple: true
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
        quantity: 1
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
      }
    },
    'Adult Show Ticket induces 2 soft drinks + 9 PIzza': {
      drinks: {
        type: 'Soft Drinks',
        quantity: 2,
        perPerson: true
      },
      pizza: {
        quantity: 1
      }
    },
    // Comedy tickets
    'Comedy ticket plus 9" Pizza': {
      pizza: {
        quantity: 1
      }
    },
    'Comedy ticket plus 9 Pizza': {
      pizza: {
        quantity: 1
      }
    },
    'Adult Comedy & Magic Show Ticket + 9" Pizza': {
      pizza: {
        quantity: 1
      }
    },
    'Adult Comedy & Magic Show Ticket + 9 Pizza': {
      pizza: {
        quantity: 1
      }
    },
    'Adult Comedy Magic Show ticket': {},
    // Groupon packages
    'Groupon Offer Prosecco Package (per person)': {
      prosecco: {
        quantity: 1,
        perPerson: true
      },
      pizza: {
        quantity: 1,
        perCouple: true
      },
      fries: {
        quantity: 1,
        perCouple: true
      }
    },
    'Groupon Magic & Pints Package (per person)': {
      drinks: {
        type: 'house pint',
        quantity: 1,
        perPerson: true
      },
      pizza: {
        quantity: 1,
        perCouple: true
      },
      fries: {
        quantity: 1,
        perCouple: true
      }
    },
    'Groupon Magic & Cocktails Package (per person)': {
      drinks: {
        type: 'house cocktail',
        quantity: 1,
        perPerson: true
      },
      pizza: {
        quantity: 1,
        perCouple: true
      },
      fries: {
        quantity: 1,
        perCouple: true
      }
    },
    'Groupon Magic Show, Snack and Loaded Fries Package (per person)': {
      drinks: {
        type: 'Drink',
        quantity: 1,
        perPerson: true
      },
      pizza: {
        quantity: 1,
        perCouple: true
      },
      fries: {
        quantity: 1,
        perCouple: true
      }
    },
    'OLD Groupon Offer (per person - extras are already included)': {
      drinks: {
        type: 'Drink',
        quantity: 1,
        perPerson: true
      },
      pizza: {
        quantity: 1,
        perCouple: true
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
        perCouple: true
      },
      fries: {
        quantity: 1,
        perCouple: true
      }
    },
    // Smoke offers
    'Smoke Offer Ticket & 1x Drink': {
      drinks: {
        type: 'drink',
        quantity: 1,
        perPerson: true
      }
    },
    'Smoke Offer Ticket & 1x Drink (minimum x2 people)': {
      drinks: {
        type: 'drink',
        quantity: 1,
        perPerson: true
      },
      minimum_people: 2
    },
    'Smoke Offer Ticket includes Drink (minimum x2)': {
      drinks: {
        type: 'drink',
        quantity: 1,
        perPerson: true
      },
      minimum_people: 2
    }
  };

  // Generate comprehensive order summary with enhanced GYG/Viator detection and new calculation logic
  const getOrderSummary = (guest: Guest, totalGuestCount?: number): string => {
    // Use the provided total guest count for booking groups, or fallback to individual guest count
    const guestCount = totalGuestCount || guest.total_quantity || 1;
    const orderItems: string[] = [];
    
    // Safe String Extractors - Check direct Status field first, then ticket_data
    const statusField = guest.Status || guest.status || guest.ticket_data?.Status;
    const statusStr = typeof statusField === 'object' && statusField?.value
      ? String(statusField.value).toLowerCase()
      : String(statusField || '').toLowerCase();

    const noteRaw = guest.Note || guest.note || guest.ticket_data?.Note;
    const noteStr = typeof noteRaw === 'object' && noteRaw?.value
      ? String(noteRaw.value).toLowerCase()
      : String(noteRaw || '').toLowerCase();
    
    // Enhanced Detection Logic with Full Ticket Search
    const ticketDataStr = JSON.stringify(guest.ticket_data || {}).toLowerCase();
    const bookerName = guest.booker_name || '';
    const itemDetails = guest.item_details || '';
    
    // Step 1: Robust Detection with Status column and Full Ticket Search
    const isGYGBooking =
      statusStr.includes("paid in gyg") ||
      noteStr.includes("gyg booking reference") ||
      ticketDataStr.includes("paid in gyg");

    const isViatorBooking =
      statusStr.includes("viator") ||
      noteStr.includes("viator") ||
      ticketDataStr.includes("viator") ||
      (guest?.booking_source?.toLowerCase?.() === "viator");
    
    // DEBUG: Show actual guest data structure to find where GYG/Viator info is stored
    console.log("🔍 COMPLETE GUEST DEBUG for", guest.booker_name, {
      id: guest.id,
      booking_code: guest.booking_code,
      booker_name: guest.booker_name,
      total_quantity: guest.total_quantity,
      show_time: guest.show_time,
      item_details: guest.item_details,
      notes: guest.notes,
      booking_comments: guest.booking_comments,
      ticket_data: guest.ticket_data,
      // Check all possible fields for GYG/Viator keywords
      hasGYGInItemDetails: (guest.item_details || '').toLowerCase().includes('gyg'),
      hasGYGInNotes: (guest.notes || '').toLowerCase().includes('gyg'),
      hasGYGInComments: (guest.booking_comments || '').toLowerCase().includes('gyg'),
      hasViatorInItemDetails: (guest.item_details || '').toLowerCase().includes('viator'),
      hasViatorInNotes: (guest.notes || '').toLowerCase().includes('viator'),
      hasViatorInComments: (guest.booking_comments || '').toLowerCase().includes('viator'),
      detectionResults: {
        isGYGBooking,
        isViatorBooking
      }
    });

    // Fuzzy Package Detection for enhanced robustness
    const allTextContent = `${bookerName} ${itemDetails} ${ticketDataStr}`.toLowerCase();
    const isGrouponProsecco = allTextContent.includes('groupon prosecco');
    const isWowcherProsecco = allTextContent.includes('wowcher prosecco');
    const isGrouponPints = allTextContent.includes('groupon pints');
    const isGrouponCocktail = allTextContent.includes('groupon cocktail');
    const isWowcherCocktail = allTextContent.includes('wowcher cocktail');

    // Log the detection path for debugging
    console.log("🚀 Processing Path:", {
      name: guest.booker_name,
      bookingCode: guest.booking_code,
      isGYGBooking,
      isViatorBooking,
      isGrouponProsecco,
      isWowcherProsecco,
      isGrouponPints,
      isGrouponCocktail,
      isWowcherCocktail
    });

    // Step 2: GYG Logic (Highest Priority)
    if (isGYGBooking) {
      const orderSummary = {
        prosecco: guestCount,
        pizza: 1, // always 1 pizza for GYG
        fries: guestCount > 1 ? Math.floor(guestCount / 2) : 0
      };
      
      orderItems.push(`${orderSummary.prosecco} Prosecco${orderSummary.prosecco > 1 ? 's' : ''}`);
      orderItems.push('1 Pizza');
      if (orderSummary.fries > 0) {
        orderItems.push(`${orderSummary.fries} Fries`);
      }
      
      console.log(`🟢 GYG Detected for ${guest.booker_name}: ${guestCount} guests`);
      
      return orderItems.join(', ');
    }

    // Step 3: Viator Logic (Second Priority)
    if (isViatorBooking) {
      const orderSummary = {
        prosecco: guestCount,
        pizza: Math.floor(guestCount / 2),
        fries: Math.floor(guestCount / 2)
      };
      
      orderItems.push(`${orderSummary.prosecco} Prosecco${orderSummary.prosecco > 1 ? 's' : ''}`);
      if (orderSummary.pizza > 0) orderItems.push(`${orderSummary.pizza} Pizza${orderSummary.pizza > 1 ? 's' : ''}`);
      if (orderSummary.fries > 0) orderItems.push(`${orderSummary.fries} Fries`);
      
      console.log(`🔵 Viator Detected for ${guest.booker_name}: ${guestCount} guests`);
      
      return orderItems.join(', ');
    }

    // Step 4: Check if guest has explicit ticket mappings FIRST
    const tickets = getAllTicketTypes(guest);
    const hasExplicitMapping = tickets.some(ticket => TICKET_TYPE_MAPPING[ticket.type]);
    
    if (hasExplicitMapping) {
      console.log("✅ Using Explicit Ticket Mapping Path for", guest.booker_name);
      
      // Process tickets using structured TICKET_TYPE_MAPPING with exact matching
      tickets.forEach(ticket => {
        const packageInfo = TICKET_TYPE_MAPPING[ticket.type];
        
        if (packageInfo) {
          // Calculate drinks
          if (packageInfo.drinks) {
            let quantity;
            if (packageInfo.drinks.perPerson) {
              quantity = packageInfo.drinks.quantity * guestCount;
            } else {
              quantity = packageInfo.drinks.quantity;
            }
            
            if (quantity > 0) {
              const drinkName = packageInfo.drinks.type;
              orderItems.push(`${quantity} ${drinkName}${quantity > 1 && !drinkName.toLowerCase().endsWith('s') ? 's' : ''}`);
            }
          }
          
          // Calculate prosecco
          if (packageInfo.prosecco) {
            let quantity;
            if (packageInfo.prosecco.perPerson) {
              quantity = packageInfo.prosecco.quantity * guestCount;
            } else {
              quantity = packageInfo.prosecco.quantity;
            }
            
            if (quantity > 0) {
              orderItems.push(`${quantity} Prosecco${quantity > 1 ? 's' : ''}`);
            }
          }
          
          // Calculate pizzas
          if (packageInfo.pizza && packageInfo.pizza.quantity > 0) {
            let quantity;
            if (packageInfo.pizza.perCouple) {
              quantity = Math.floor(guestCount / 2);
            } else {
              quantity = packageInfo.pizza.quantity;
            }
            
            if (quantity > 0) {
              orderItems.push(`${quantity} Pizza${quantity > 1 ? 's' : ''}`);
            }
          }
          
          // Calculate fries
          if (packageInfo.fries && packageInfo.fries.quantity > 0) {
            let quantity;
            if (packageInfo.fries.perCouple) {
              quantity = Math.floor(guestCount / 2);
            } else {
              quantity = packageInfo.fries.quantity;
            }
            
            if (quantity > 0) {
              orderItems.push(`${quantity} Fries`);
            }
          }
          
          // Calculate extras
          if (packageInfo.extras && packageInfo.extras.length > 0) {
            packageInfo.extras.forEach(extra => {
              orderItems.push(extra);
            });
          }
        }
      });
      
      if (orderItems.length > 0) {
        console.log(`✅ Explicit mapping result for ${guest.booker_name}: ${orderItems.join(', ')}`);
        return orderItems.join(', ');
      }
    }

    // Step 5: Fuzzy Package Detection ONLY if no explicit mapping found
    if (isGrouponProsecco || isWowcherProsecco) {
      const proseccoQuantity = guestCount;
      const pizzaQuantity = Math.floor(guestCount / 2);
      const friesQuantity = Math.floor(guestCount / 2);
      
      orderItems.push(`${proseccoQuantity} Prosecco${proseccoQuantity > 1 ? 's' : ''}`);
      if (pizzaQuantity > 0) orderItems.push(`${pizzaQuantity} Pizza${pizzaQuantity > 1 ? 's' : ''}`);
      if (friesQuantity > 0) orderItems.push(`${friesQuantity} Fries`);
      
      console.log("✅ Fuzzy Prosecco Path:", guest.booker_name, orderItems.join(', '));
      return orderItems.join(', ');
    }

    if (isGrouponPints) {
      const pintsQuantity = guestCount;
      const pizzaQuantity = Math.floor(guestCount / 2);
      const friesQuantity = Math.floor(guestCount / 2);
      
      orderItems.push(`${pintsQuantity} House Pint${pintsQuantity > 1 ? 's' : ''}`);
      if (pizzaQuantity > 0) orderItems.push(`${pizzaQuantity} Pizza${pizzaQuantity > 1 ? 's' : ''}`);
      if (friesQuantity > 0) orderItems.push(`${friesQuantity} Fries`);
      
      console.log("✅ Fuzzy Pints Path:", guest.booker_name, orderItems.join(', '));
      return orderItems.join(', ');
    }

    if (isGrouponCocktail || isWowcherCocktail) {
      const cocktailQuantity = guestCount;
      const pizzaQuantity = Math.floor(guestCount / 2);
      const loadedFriesQuantity = Math.floor(guestCount / 2);
      
      orderItems.push(`${cocktailQuantity} House Cocktail${cocktailQuantity > 1 ? 's' : ''}`);
      if (pizzaQuantity > 0) orderItems.push(`${pizzaQuantity} Pizza${pizzaQuantity > 1 ? 's' : ''}`);
      if (loadedFriesQuantity > 0) orderItems.push(`${loadedFriesQuantity} Loaded Fries`);
      
      console.log("✅ Fuzzy Cocktail Path:", guest.booker_name, orderItems.join(', '));
      return orderItems.join(', ');
    }

    // Step 6: Default fallback
    console.log("⚠️ No valid path found for", guest.booker_name, "- using fallback");
    
    return orderItems.length > 0 ? orderItems.join(', ') : 'Show ticket only';
  };

  // Extract detailed package information for staff display (fallback for info popover)
  const getPackageDetails = (guest: Guest): Array<{
    type: string;
    quantity: number;
    details: string[];
  }> => {
    const tickets = getAllTicketTypes(guest);
    
    return tickets.map(ticket => {
      const packageInfo = TICKET_TYPE_MAPPING[ticket.type];
      const details: string[] = [];
      
      if (packageInfo) {
        if (packageInfo.minimum_people) {
          details.push(`Valid only for bookings of ${packageInfo.minimum_people} or more people`);
        }
      }
      
      return {
        type: ticket.type,
        quantity: ticket.quantity,
        details
      };
    });
  };

  // Get all ticket types for a guest - improved parsing logic
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
        // Skip non-ticket fields - including Friends, DIET, Magic that contain names/text
        if (!key || ['booker_name', 'booking_code', 'notes', 'show_time', 'extracted_tickets', 'Booker', 'Booking', 'Booking Code', 'Item', 'Note', 'Status', 'Total', 'Total Quantity', 'Guests', 'TERMS', 'Friends', 'DIET', 'Magic'].includes(key)) {
          return;
        }

        // Parse quantity - handle various formats
        let quantity = 0;
        if (typeof value === 'number' && value > 0) {
          quantity = value;
        } else if (typeof value === 'string' && value.trim() !== '') {
          // Check if the string contains friend names (multiple words with &)
          if (value.includes('&') || value.split(' ').length > 3) {
            console.log(`🚫 Skipping '${key}' with value '${value}' - appears to contain names`);
            return;
          }
          
          const parsed = parseInt(value);
          if (!isNaN(parsed) && parsed > 0) {
            quantity = parsed;
          }
        }

        // Only add if we found a valid numeric quantity OR it's a known ticket type
        if (quantity > 0 || Object.keys(TICKET_TYPE_MAPPING).includes(key)) {
          console.log(`✅ Adding ticket type '${key}' with quantity ${quantity || 1} for ${guest.booker_name}`);
          tickets.push({
            type: key,
            quantity: quantity || 1
          });
        }
      });
    }
    return tickets;
  };

  // Pizza info calculation
  const getPizzaInfo = (guest: Guest): string => {
    if (!guest.interval_pizza_order) return '';
    const allTickets = getAllTicketTypes(guest);
    let totalPizzas = 0;
    allTickets.forEach(({
      type,
      quantity
    }) => {
      const mapping = TICKET_TYPE_MAPPING[type];
      if (mapping?.pizza) {
        totalPizzas += quantity * mapping.pizza.quantity;
      }
    });
    if (totalPizzas === 0) {
      totalPizzas = guest.total_quantity || 1;
    }
    return totalPizzas > 1 ? `${totalPizzas} Pizzas` : '1 Pizza';
  };

  // Drinks info calculation
  const getDrinksInfo = (guest: Guest): string => {
    if (!guest.interval_drinks_order) return '';
    const allTickets = getAllTicketTypes(guest);
    let totalDrinks = 0;
    allTickets.forEach(({
      type,
      quantity
    }) => {
      const mapping = TICKET_TYPE_MAPPING[type];
      if (mapping?.drinks) {
        totalDrinks += quantity * mapping.drinks.quantity;
      }
    });
    if (totalDrinks === 0) {
      totalDrinks = (guest.total_quantity || 1) * 2;
    }
    return `${totalDrinks} Drinks`;
  };

  // Helper function to validate if text is actual dietary information
  const isDietaryInformation = (text: string): boolean => {
    const dietaryKeywords = [
      'vegetarian', 'vegan', 'pescatarian', 'gluten', 'coeliac', 'celiac',
      'dairy', 'lactose', 'nut', 'allergy', 'allergic', 'intolerant', 
      'halal', 'kosher', 'diet', 'dietary', 'food', 'eating'
    ];
    
    const lowerText = text.toLowerCase();
    return dietaryKeywords.some(keyword => lowerText.includes(keyword));
  };

  // Extract and process diet and magic information from guest data and save to database
  useEffect(() => {
    console.log('🚀 DIET/MAGIC EXTRACTION useEffect TRIGGERED');
    
    if (!guests || guests.length === 0) {
      console.log('❌ No guests found, exiting extraction');
      return;
    }
    
    console.log(`🔍 Starting diet/magic extraction for ${guests.length} guests`);
    
    const updateGuestsWithDietMagic = async () => {
      const guestsToUpdate: { id: string; diet_info?: string; magic_info?: string }[] = [];
      
      guests.forEach((guest, index) => {
        console.log(`🔍 Checking guest ${index}: ${guest.booker_name}`, {
          hasTicketData: !!guest.ticket_data,
          ticketData: guest.ticket_data,
          hasGuestData: !!guest,
          guestKeys: Object.keys(guest || {}),
          existingDiet: guest.diet_info,
          existingMagic: guest.magic_info
        });
        
        // Check if guest has any data fields to extract from
        if (!guest) {
          console.log(`❌ Skipping - no guest data`);
          return;
        }
        
        // Handle both ticket_data format and direct field format
        const ticketData = guest.ticket_data || guest;
        
        let hasUpdates = false;
        const updates: { id: string; diet_info?: string; magic_info?: string } = { id: guest.id };
        
        // Extract diet information with validation
        const dietData = ticketData.DIET || ticketData.Diet || ticketData.diet;
        if (dietData && typeof dietData === 'string' && dietData.trim() !== '' && !guest.diet_info) {
          const trimmedDiet = dietData.trim();
          // Only extract if it's actually dietary information
          if (isDietaryInformation(trimmedDiet)) {
            updates.diet_info = trimmedDiet;
            guest.diet_info = trimmedDiet; // Update local state
            hasUpdates = true;
            console.log(`✅ Found valid diet info for ${guest.booker_name}: ${guest.diet_info}`);
          } else {
            console.log(`❌ Ignoring non-dietary text for ${guest.booker_name}: "${trimmedDiet}"`);
          }
        }
        
        // Extract magic information
        const magicData = ticketData.Magic || ticketData.MAGIC || ticketData.magic;
        if (magicData && typeof magicData === 'string' && magicData.trim() !== '' && !guest.magic_info) {
          const trimmedMagic = magicData.trim();
          updates.magic_info = trimmedMagic;
          guest.magic_info = trimmedMagic; // Update local state
          hasUpdates = true;
          console.log(`✨ Found magic info for ${guest.booker_name}: ${guest.magic_info}`);
        }
        
        if (hasUpdates) {
          guestsToUpdate.push(updates);
        }
      });
      
      // Update database with extracted diet and magic info
      if (guestsToUpdate.length > 0) {
        try {
          for (const guestUpdate of guestsToUpdate) {
            const { error } = await supabase
              .from('guests')
              .update({
                diet_info: guestUpdate.diet_info,
                magic_info: guestUpdate.magic_info
              })
              .eq('id', guestUpdate.id);
            
            if (error) {
              console.error('Error updating guest with diet/magic info:', error);
            } else {
              console.log(`📝 Successfully updated database for guest ${guestUpdate.id}`);
            }
          }
          console.log(`🎉 Updated ${guestsToUpdate.length} guests with diet/magic information`);
        } catch (error) {
          console.error('Failed to update guests with diet/magic info:', error);
        }
      }
    };
    
    updateGuestsWithDietMagic();
  }, [guests, guestListId]); // Also trigger when guest list changes

  // Extract and process friendship groups from guest data
  const processFriendshipGroups = useMemo(() => {
    if (!guests || guests.length === 0) return new Map<string, number[]>();
    
    const groups = new Map<string, number[]>();
    
    guests.forEach((guest, index) => {
      if (!guest || !guest.ticket_data) return;
      
      // Extract friends data from ticket_data
      const friendsData = guest.ticket_data.Friends || guest.ticket_data.friends;
      
      if (friendsData && typeof friendsData === 'string' && friendsData.trim() !== '') {
        const friendsValue = friendsData.trim();
        
        // If this friendship group already exists, add this guest to it
        if (groups.has(friendsValue)) {
          const existingGroup = groups.get(friendsValue)!;
          if (!existingGroup.includes(index)) {
            existingGroup.push(index);
          }
        } else {
          // Create new friendship group
          groups.set(friendsValue, [index]);
        }
        
        console.log(`Found friendship group "${friendsValue}" for guest ${guest.booker_name} (index ${index})`);
      }
    });
    
    // Only keep groups with more than one member
    const filteredGroups = new Map<string, number[]>();
    groups.forEach((indices, groupName) => {
      if (indices.length > 1) {
        filteredGroups.set(groupName, indices);
        console.log(`Friendship group "${groupName}" has ${indices.length} members:`, indices);
      }
    });
    
    return filteredGroups;
  }, [guests]);

  // Update friendship groups state when processed groups change
  useEffect(() => {
    if (processFriendshipGroups.size > 0) {
      setFriendshipGroups(processFriendshipGroups);
    }
  }, [processFriendshipGroups]);

  // Group bookings by booking code
  const groupedBookings = useMemo(() => {
    if (!guests || guests.length === 0) return [];
    const bookingGroups: BookingGroup[] = [];
    const processedIndices = new Set<number>();
    guests.forEach((guest, index) => {
      if (processedIndices.has(index) || !guest) return;
      const bookingCode = guest.booking_code;
      const bookerName = guest.booker_name;
      if (!bookingCode || !bookerName) return;
      const relatedBookings = guests.map((g, i) => ({
        guest: g,
        index: i
      })).filter(({
        guest: g,
        index: i
      }) => !processedIndices.has(i) && g && g.booking_code === bookingCode && g.booker_name === bookerName);
      if (relatedBookings.length > 0) {
        const mainBooking = relatedBookings[0];
        const addOns = relatedBookings.slice(1);
        bookingGroups.push({
          mainBooking: mainBooking.guest,
          addOns: addOns.map(rb => rb.guest),
          originalIndex: mainBooking.index,
          addOnIndices: addOns.map(rb => rb.index)
        });
        relatedBookings.forEach(({
          index
        }) => processedIndices.add(index));
      }
    });
    return bookingGroups;
  }, [guests]);

  // Filter bookings based on search and show time
  const filteredBookings = useMemo(() => {
    return groupedBookings.filter(booking => {
      if (!booking?.mainBooking) return false;
      const matchesSearch = searchTerm === '' || extractGuestName(booking.mainBooking.booker_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const guestShowTime = booking.mainBooking.show_time || booking.mainBooking['Show time'] || '';
      // If guest has no show time and we're filtering by a specific time, include them
      // If showFilter is 'all' or empty, include all guests
      // If guest has show time and it matches filter, include them
      const matchesShow = showFilter === 'all' || showFilter === '' || guestShowTime === '' || guestShowTime === showFilter;
      return matchesSearch && matchesShow;
    });
  }, [groupedBookings, searchTerm, showFilter]);

  // Statistics calculations - use actual guest data
  const getTotalGuests = () => {
    if (!guests || guests.length === 0) return 0;
    const guestTotal = guests.reduce((total, guest) => total + (guest.total_quantity || 1), 0);
    const walkInTotal = walkInGuests.reduce((total, guest) => total + (guest.total_quantity || 0), 0);
    return guestTotal + walkInTotal;
  };
  const getCheckedInGuestsCount = () => {
    let count = 0;
    groupedBookings.forEach(booking => {
      if (checkedInGuests.has(booking.originalIndex)) {
        count += booking.mainBooking?.total_quantity || 0;
      }
    });
    walkInGuests.forEach((_, index) => {
      const walkInIndex = 10000 + index;
      if (checkedInGuests.has(walkInIndex)) {
        count += walkInGuests[index]?.total_quantity || 0;
      }
    });
    return count;
  };
  const getAllocatedGuestsCount = () => {
    let count = 0;
    groupedBookings.forEach(booking => {
      if (allocatedGuests.has(booking.originalIndex)) {
        count += booking.mainBooking?.total_quantity || 0;
      }
    });
    walkInGuests.forEach((_, index) => {
      const walkInIndex = 10000 + index;
      if (allocatedGuests.has(walkInIndex)) {
        count += walkInGuests[index]?.total_quantity || 0;
      }
    });
    return count;
  };
  const getTotalPizzasNeeded = () => {
    let totalPizzas = 0;
    groupedBookings.forEach(booking => {
      if (checkedInGuests.has(booking.originalIndex) && booking.mainBooking?.interval_pizza_order) {
        const pizzaText = getPizzaInfo(booking.mainBooking);
        const match = pizzaText.match(/(\d+)/);
        if (match) {
          totalPizzas += parseInt(match[1]);
        }
      }
    });
    return totalPizzas;
  };
  const getShowTimeStats = () => {
    const stats = {
      '7pm': 0,
      '8pm': 0,
      '9pm': 0,
      'Unknown': 0
    };
    groupedBookings.forEach(booking => {
      if (!booking?.mainBooking) return;
      const showTime = booking.mainBooking.show_time || booking.mainBooking['Show time'] || 'Unknown';
      const totalQty = booking.mainBooking.total_quantity || 1;
      if (showTime in stats) {
        stats[showTime as keyof typeof stats] += totalQty;
      } else {
        stats['Unknown'] += totalQty;
      }
    });
    return stats;
  };

  // Event handlers
  const handleCheckIn = (guestIndex: number) => {
    const newCheckedIn = new Set(checkedInGuests);
    if (newCheckedIn.has(guestIndex)) {
      newCheckedIn.delete(guestIndex);
    } else {
      newCheckedIn.add(guestIndex);
      // Auto-open pager assignment dialog when checking in
      setTimeout(() => {
        setSelectedGuestForPager(guestIndex);
      }, 100); // Small delay to ensure UI updates properly
    }
    setCheckedInGuests(newCheckedIn);
  };
  const handlePagerAction = (guestIndex: number, pagerNumber?: number) => {
    if (pagerAssignments.has(guestIndex)) {
      // Release pager
      const newAssignments = new Map(pagerAssignments);
      newAssignments.delete(guestIndex);
      setPagerAssignments(newAssignments);
    } else {
      // Show pager assignment dialog
      setSelectedGuestForPager(guestIndex);
    }
  };
  const handleTableAllocate = (guestIndex: number) => {
    // This would open the table allocation component
    // For now, just mark as allocated
    const newAllocated = new Set(allocatedGuests);
    newAllocated.add(guestIndex);
    setAllocatedGuests(newAllocated);
  };
  const handleSeat = (guestIndex: number) => {
    const newSeated = new Set(seatedGuests);
    if (newSeated.has(guestIndex)) {
      newSeated.delete(guestIndex);
    } else {
      newSeated.add(guestIndex);
    }
    setSeatedGuests(newSeated);
  };
  const handleComment = (guestIndex: number) => {
    setSelectedGuestForComment(guestIndex);
    setCommentText(bookingComments.get(guestIndex) || '');
    setCommentDialogOpen(true);
  };
  const handleAddWalkIn = (walkInData: {
    name: string;
    count: number;
    showTime: string;
    notes?: string;
  }) => {
    const newWalkIn: Guest = {
      id: `walk-in-${Date.now()}`,
      booking_code: `WALK-${Date.now()}`,
      booker_name: walkInData.name,
      total_quantity: walkInData.count,
      show_time: walkInData.showTime,
      notes: walkInData.notes,
      is_checked_in: false,
      pager_number: null,
      table_assignments: null,
      interval_pizza_order: false,
      interval_drinks_order: false
    };
    setWalkInGuests([...walkInGuests, newWalkIn]);
    toast({
      title: "Walk-in Guest Added",
      description: `${walkInData.name} (${walkInData.count} guests) added for ${walkInData.showTime}`
    });
  };
  // Convert checked-in guests set to array format expected by TableAllocation
  const checkedInGuestsArray = React.useMemo(() => {
    console.log('Building checkedInGuestsArray, checkedInGuests:', checkedInGuests.size);
    console.log('groupedBookings length:', groupedBookings?.length || 0);
    console.log('walkInGuests length:', walkInGuests?.length || 0);
    
    try {
      if (!groupedBookings || !Array.isArray(groupedBookings)) {
        console.warn('groupedBookings is not valid:', groupedBookings);
        return [];
      }

      const result = Array.from(checkedInGuests).map(index => {
        try {
          // Handle walk-in guests
          if (index >= 10000) {
            const walkInIndex = index - 10000;
            const walkInGuest = walkInGuests?.[walkInIndex];
            if (walkInGuest) {
              return {
                name: String(walkInGuest.booker_name || 'Unknown Walk-in'),
                count: Number(walkInGuest.total_quantity) || 1,
                showTime: String(walkInGuest.show_time || '7pm'),
                originalIndex: index,
                pagerNumber: pagerAssignments.get(index) || undefined,
                hasBeenSeated: seatedGuests.has(index),
                hasTableAllocated: allocatedGuests.has(index),
                notes: String(walkInGuest.notes || ''),
                isWalkIn: true
              };
            } else {
              console.warn(`Walk-in guest not found at index ${walkInIndex}`);
              return null;
            }
          }
          
          // Handle regular guests
          const booking = groupedBookings.find(b => b && b.originalIndex === index);
          if (booking?.mainBooking) {
            return {
              name: extractGuestName(String(booking.mainBooking.booker_name || '')),
              count: Number(booking.mainBooking.total_quantity) || 1,
              showTime: String(booking.mainBooking.show_time || '7pm'),
              originalIndex: index,
              pagerNumber: pagerAssignments.get(index) || undefined,
              hasBeenSeated: seatedGuests.has(index),
              hasTableAllocated: allocatedGuests.has(index),
              notes: String(booking.mainBooking.notes || ''),
              isWalkIn: false
            };
          } else {
            console.warn(`Booking not found for index ${index}`);
            return null;
          }
        } catch (err) {
          console.error(`Error processing guest at index ${index}:`, err);
          return null;
        }
      }).filter((guest): guest is NonNullable<typeof guest> => guest !== null);

      console.log('checkedInGuestsArray built successfully:', result.length, 'guests');
      return result;
    } catch (err) {
      console.error('Error building checkedInGuestsArray:', err);
      return [];
    }
  }, [checkedInGuests, groupedBookings, walkInGuests, pagerAssignments, seatedGuests, allocatedGuests]);

  // Table allocation handlers
  const handleTableAssign = (tableId: number, guestName: string, guestCount: number, showTime: string) => {
    // This function is called when a table is assigned to a guest
    console.log(`Assigning table ${tableId} to ${guestName} (${guestCount} people) for ${showTime}`);
  };

  const handlePagerRelease = (pagerNumber: number) => {
    // Find and release the pager assignment
    const entries = Array.from(pagerAssignments.entries());
    const entry = entries.find(([_, number]) => number === pagerNumber);
    if (entry) {
      const newAssignments = new Map(pagerAssignments);
      newAssignments.delete(entry[0]);
      setPagerAssignments(newAssignments);
    }
  };

  const handleGuestSeated = (sectionInfo: { originalIndex: number; sectionId: string; guestCount: number }) => {
    // Mark guest as seated
    const newSeated = new Set(seatedGuests);
    newSeated.add(sectionInfo.originalIndex);
    setSeatedGuests(newSeated);
    
    // Add section to seated sections
    const newSeatedSections = new Set(seatedSections);
    newSeatedSections.add(sectionInfo.sectionId);
    setSeatedSections(newSeatedSections);
  };

  const handleTableAllocated = (guestIndex: number, tableIds: number[]) => {
    // Mark guest as allocated and store table assignments
    const newAllocated = new Set(allocatedGuests);
    newAllocated.add(guestIndex);
    setAllocatedGuests(newAllocated);
    
    const newTableAllocations = new Map(guestTableAllocations);
    newTableAllocations.set(guestIndex, tableIds);
    setGuestTableAllocations(newTableAllocations);
  };

  const saveComment = () => {
    if (selectedGuestForComment !== null) {
      const newComments = new Map(bookingComments);
      if (commentText.trim()) {
        newComments.set(selectedGuestForComment, commentText.trim());
      } else {
        newComments.delete(selectedGuestForComment);
      }
      setBookingComments(newComments);
    }
    setCommentDialogOpen(false);
    setSelectedGuestForComment(null);
    setCommentText('');
  };
  return <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
        <h2 className="text-3xl font-bold text-gray-800">🎭 Smoke & Mirrors Theatre Check-In</h2>
        <p className="text-gray-600 mt-1">Simple guest management with pager assignment</p>
      </div>

      <CheckInActions onRefreshStatus={refreshStatus} onClearData={clearAllData} showClearDialog={showClearDialog} setShowClearDialog={setShowClearDialog} />

      <CheckInStats totalGuests={getTotalGuests()} checkedInCount={getCheckedInGuestsCount()} allocatedCount={getAllocatedGuestsCount()} totalPizzasNeeded={getTotalPizzasNeeded()} showTimeStats={getShowTimeStats()} lastSaved={lastSaved} />

      <Tabs defaultValue="checkin" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm">
          <TabsTrigger value="checkin">Check-In System</TabsTrigger>
          <TabsTrigger value="tables">Table Management</TabsTrigger>
          <TabsTrigger value="stats">Show Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="checkin" className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex gap-4">
              <SearchAndFilters searchTerm={searchTerm} setSearchTerm={setSearchTerm} showFilter={showFilter} setShowFilter={setShowFilter} showTimes={showTimes} />
              <WalkInGuestForm showTimes={showTimes} onAddWalkIn={handleAddWalkIn} />
            </div>
          </div>


          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <GuestTable bookingGroups={filteredBookings} checkedInGuests={checkedInGuests} seatedGuests={seatedGuests} allocatedGuests={allocatedGuests} pagerAssignments={pagerAssignments} guestTableAllocations={guestTableAllocations} partyGroups={partyGroups} bookingComments={bookingComments} walkInGuests={walkInGuests} getOrderSummary={getOrderSummary} getPackageDetails={getPackageDetails} extractGuestName={extractGuestName} onCheckIn={handleCheckIn} onPagerAction={handlePagerAction} onTableAllocate={handleTableAllocate} onSeat={handleSeat} onComment={handleComment} />
          </div>
        </TabsContent>

        <TabsContent value="tables">
          <ErrorBoundary fallback={
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-xl font-semibold mb-4">Table Management</h3>
              <p className="text-muted-foreground mb-4">Table allocation temporarily unavailable due to an error.</p>
              <Button onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            </div>
          }>
            <TableAllocation
              checkedInGuests={checkedInGuestsArray}
              onTableAssign={handleTableAssign}
              onPagerRelease={handlePagerRelease}
              onGuestSeated={handleGuestSeated}
              onTableAllocated={handleTableAllocated}
              onAddWalkIn={handleAddWalkIn}
              currentShowTime={showFilter}
            />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="stats">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-xl font-semibold mb-4">Show Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(getShowTimeStats()).map(([time, count]) => <div key={time} className="p-4 border rounded-lg">
                  <h4 className="font-medium text-lg">{time}</h4>
                  <p className="text-2xl font-bold text-blue-600">{count} guests</p>
                </div>)}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Comment Dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="comment">Comment</Label>
            <Textarea id="comment" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Enter your comment..." rows={4} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCommentDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveComment}>
                <Save className="h-4 w-4 mr-2" />
                Save Comment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pager Assignment Dialog */}
      <Dialog open={selectedGuestForPager !== null} onOpenChange={() => setSelectedGuestForPager(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Pager</DialogTitle>
          </DialogHeader>
          {selectedGuestForPager !== null && <div className="space-y-4">
              <p>Select an available pager:</p>
              <div className="grid grid-cols-4 gap-2">
                {availablePagers.filter(id => !Array.from(pagerAssignments.values()).includes(id)).map(pagerId => <Button key={pagerId} variant="outline" onClick={() => {
              const newAssignments = new Map(pagerAssignments);
              newAssignments.set(selectedGuestForPager, pagerId);
              setPagerAssignments(newAssignments);
              setSelectedGuestForPager(null);
            }} className="h-12 text-lg font-bold">
                      #{pagerId}
                    </Button>)}
              </div>
            </div>}
        </DialogContent>
      </Dialog>
    </div>;
};
export default CheckInSystem;