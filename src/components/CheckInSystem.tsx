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
import { SeatingManagement } from './seating/SeatingManagement';
import { ManualEditDialog } from './checkin/ManualEditDialog';
import { ManualLinkDialog } from './checkin/ManualLinkDialog';

import { Guest, CheckInSystemProps, BookingGroup, PartyGroup } from './checkin/types';
import { extractShowTimeFromText, normalizeShowTime } from '@/utils/showTimeExtractor';

const CheckInSystem = ({
  guests: guestsProp,
  headers,
  showTimes,
  guestListId
}: CheckInSystemProps) => {
  const {
    user
  } = useAuth();
  const [guests, setGuests] = useState<Guest[]>(guestsProp);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState('all');
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedGuestForEdit, setSelectedGuestForEdit] = useState<Guest | null>(null);
  const [commentText, setCommentText] = useState('');
  const [guestNotes, setGuestNotes] = useState<Map<number, string>>(new Map());
  const [manualLinks, setManualLinks] = useState<Map<string, number[]>>(new Map());

  // Sync local guests state with prop
  useEffect(() => {
    setGuests(guestsProp);
  }, [guestsProp]);

  // Initialize show filter - keep "all" as default unless user has selected something specific
  useEffect(() => {
    if (showTimes && showTimes.length > 0 && showFilter !== 'all' && !showTimes.includes(showFilter)) {
      setShowFilter('all');
    }
  }, [showTimes, showFilter]);


  // Clear all data function - updated to include manual links
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
      setManualLinks(new Map());
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
      setManualLinks(new Map());
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
          setManualLinks(new Map(Object.entries((currentSession as any).manual_links || {}).map(([k, v]) => [k, v as number[]])));
          setWalkInGuests(currentSession.walk_in_guests as Guest[] || []);
          
          
          // Load guest notes
          const guestNotesData = (currentSession as any).guest_notes || {};
          setGuestNotes(new Map(Object.entries(guestNotesData).map(([k, v]) => [parseInt(k), v as string])));
          
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

  // Auto-save to Supabase - updated to include manual links
  useEffect(() => {
    if (!isInitialized || !user?.id) return;
    const saveState = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const sessionData: any = {
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
          guest_notes: Object.fromEntries(guestNotes) as any,
          manual_links: Object.fromEntries(manualLinks) as any,
          walk_in_guests: walkInGuests as any,
        };
        const { error } = await supabase
          .from('checkin_sessions')
          .upsert(sessionData, { onConflict: 'user_id,guest_list_id,session_date' });
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
  }, [isInitialized, user?.id, guestListId, checkedInGuests, pagerAssignments, seatedGuests, seatedSections, allocatedGuests, guestTableAllocations, partyGroups, friendshipGroups, bookingComments, guestNotes, manualLinks, walkInGuests]);

  // Enhanced guest name extraction utility with debug logging
  const extractGuestName = (bookerName: string, ticketData?: any, debug = false) => {
    let foundName = '';
    let source = '';

    // First try to get full name from ticket data
    if (ticketData) {
      const firstName = ticketData['First Name'] || ticketData['first_name'] || '';
      const lastName = ticketData['Last Name'] || ticketData['last_name'] || '';
      
      if (firstName && lastName) {
        foundName = `${firstName.trim()} ${lastName.trim()}`;
        source = 'firstName + lastName';
      } else if (firstName) {
        foundName = firstName.trim();
        source = 'firstName only';
      } else if (lastName) {
        foundName = lastName.trim();
        source = 'lastName only';
      }
      
      // If still no name, check additional fields
      if (!foundName) {
        const bookerField = ticketData['Booker'] || ticketData['booker'] || '';
        if (bookerField) {
          foundName = bookerField.trim();
          source = 'Booker field';
        }
      }

      // Check additional fields that might contain single names
      if (!foundName) {
        const additionalFields = [
          'Name', 'Full Name', 'Customer Name', 'Guest Name', 
          'Contact Name', 'Traveller', 'Via-Cust'
        ];
        
        for (const field of additionalFields) {
          const value = ticketData[field];
          if (value && typeof value === 'string' && value.trim()) {
            // Handle Via-Cust field specially (extract name from contact info)
            if (field === 'Via-Cust' && value.includes('Contact:')) {
              const contactMatch = value.match(/Contact:\s*([^:]+?):/);
              if (contactMatch && contactMatch[1]) {
                foundName = contactMatch[1].trim();
                source = 'Via-Cust contact';
                break;
              }
            } else {
              foundName = value.trim();
              source = field;
              break;
            }
          }
        }
      }
    }
    
    // Fall back to booker_name if ticket data doesn't have names
    if (!foundName && bookerName && bookerName.trim()) {
      foundName = bookerName.trim();
      source = 'bookerName';
    }
    
    // Final fallback
    if (!foundName) {
      foundName = 'Unknown Guest';
      source = 'fallback';
    }

    // Debug logging for single names
    if (debug || (foundName.split(' ').length === 1 && foundName !== 'Unknown Guest')) {
      console.log(`🔍 NAME DEBUG: Found "${foundName}" from ${source}`, {
        bookerName,
        ticketDataKeys: ticketData ? Object.keys(ticketData) : [],
        foundName,
        source
      });
    }
    
    return foundName;
  };

  // Derive show time helper function
  const deriveShowTime = (guest: Guest): string => {
    // Check existing show_time first
    if (guest.show_time && guest.show_time !== 'N/A') {
      return guest.show_time;
    }

    // Try to extract from item_details
    if (guest.item_details) {
      const extracted = extractShowTimeFromText(guest.item_details);
      if (extracted) {
        return normalizeShowTime(extracted);
      }
    }

    // Try to extract from ticket_data fields
    if (guest.ticket_data) {
      const itemField = guest.ticket_data.Item || guest.ticket_data.item || '';
      if (itemField) {
        const extracted = extractShowTimeFromText(itemField);
        if (extracted) {
          return normalizeShowTime(extracted);
        }
      }
    }

    return '';
  };

  // Enhanced ticket type mapping with calculation method support
  const TICKET_TYPE_MAPPING: Record<string, {
    calculationMethod: 'per-ticket' | 'per-person';
    drinks?: {
      type: string;
      quantity: number;
    };
    pizza?: {
      quantity: number;
    };
    fries?: {
      quantity: number;
      type?: 'regular' | 'loaded';
    };
    prosecco?: {
      quantity: number;
    };
    extras?: string[];
    minimum_people?: number;
  }> = {
    // Standard House Magicians tickets
    'House Magicians Show Ticket': {
      calculationMethod: 'per-ticket'
      // Basic show ticket - show only unless GYG/Viator detected
    },
    'House Magicians Show Ticket & 2 Drinks': {
      calculationMethod: 'per-ticket',
      drinks: {
        type: 'drinks',
        quantity: 2
      }
    },
    'House Magicians Show Ticket includes 2 Drinks +  1 Pizza': {
      calculationMethod: 'per-person',
      drinks: {
        type: 'drinks',
        quantity: 2
      },
      pizza: {
        quantity: 1
      }
    },
    'House Magicians Show Ticket & 1 Pizza': {
      calculationMethod: 'per-ticket',
      pizza: {
        quantity: 1
      }
    },
    'House Magicians Show Ticket includes 2 Drinks + 1 Pizza': {
      calculationMethod: 'per-person',
      drinks: {
        type: 'drinks',
        quantity: 2
      },
      pizza: {
        quantity: 1
      }
    },
    'House Magicians Show Ticket & 2 soft drinks': {
      calculationMethod: 'per-ticket',
      drinks: {
        type: 'soft drinks',
        quantity: 2
      }
    },
    // Adult Show tickets
    'Adult Show Ticket includes 2 Drinks': {
      calculationMethod: 'per-ticket',
      drinks: {
        type: 'Drinks',
        quantity: 2
      }
    },
    'Adult Show Ticket includes 2 Drinks + 9" Pizza': {
      calculationMethod: 'per-ticket',
      drinks: {
        type: 'Drinks',
        quantity: 2
      },
      pizza: {
        quantity: 1
      }
    },
    'Adult Show Ticket induces 2 soft drinks': {
      calculationMethod: 'per-ticket',
      drinks: {
        type: 'Soft Drinks',
        quantity: 2
      }
    },
    'Adult Show Ticket induces 2 soft drinks + 9" PIzza': {
      calculationMethod: 'per-ticket',
      drinks: {
        type: 'Soft Drinks',
        quantity: 2
      },
      pizza: {
        quantity: 1
      }
    },
    'Adult Show Ticket induces 2 soft drinks + 9 PIzza': {
      calculationMethod: 'per-ticket',
      drinks: {
        type: 'Soft Drinks',
        quantity: 2
      },
      pizza: {
        quantity: 1
      }
    },
    // Comedy tickets
    'Comedy ticket plus 9" Pizza': {
      calculationMethod: 'per-ticket',
      pizza: {
        quantity: 1
      }
    },
    'Comedy ticket plus 9 Pizza': {
      calculationMethod: 'per-ticket',
      pizza: {
        quantity: 1
      }
    },
    'Adult Comedy & Magic Show Ticket + 9" Pizza': {
      calculationMethod: 'per-ticket',
      pizza: {
        quantity: 1
      }
    },
    'Adult Comedy & Magic Show Ticket + 9 Pizza': {
      calculationMethod: 'per-ticket',
      pizza: {
        quantity: 1
      }
    },
    'Adult Comedy Magic Show ticket': {
      calculationMethod: 'per-ticket'
    },
    // Groupon packages
    'Groupon Offer Prosecco Package (per person)': {
      calculationMethod: 'per-person',
      prosecco: {
        quantity: 1
      },
      pizza: {
        quantity: 0.5
      },
      fries: {
        quantity: 0.5
      }
    },
    'Groupon Magic & Pints Package (per person)': {
      calculationMethod: 'per-person',
      drinks: {
        type: 'house pint',
        quantity: 1
      },
      pizza: {
        quantity: 0.5
      },
      fries: {
        quantity: 0.5
      }
    },
    'Groupon Magic & Cocktails Package (per person)': {
      calculationMethod: 'per-person',
      drinks: {
        type: 'house cocktail',
        quantity: 1
      },
      pizza: {
        quantity: 0.5
      },
      fries: {
        quantity: 0.5,
        type: 'loaded'
      }
    },
    'Groupon Magic Show, Snack and Loaded Fries Package (per person)': {
      calculationMethod: 'per-person',
      drinks: {
        type: 'Drink',
        quantity: 1
      },
      pizza: {
        quantity: 0.5
      },
      fries: {
        quantity: 0.5
      }
    },
    'OLD Groupon Offer (per person - extras are already included)': {
      calculationMethod: 'per-person',
      drinks: {
        type: 'Drink',
        quantity: 1
      },
      pizza: {
        quantity: 0.5
      }
    },
    // Wowcher packages
    'Wowcher Magic & Cocktails Package (per person)': {
      calculationMethod: 'per-person',
      drinks: {
        type: 'Cocktail',
        quantity: 1
      },
      pizza: {
        quantity: 0.5
      },
      fries: {
        quantity: 0.5,
        type: 'loaded'
      }
    },
    // Smoke offers
    'Smoke Offer Ticket & 1x Drink': {
      calculationMethod: 'per-person',
      drinks: {
        type: 'drink',
        quantity: 1
      }
    },
    'Smoke Offer Ticket & 1x Drink (minimum x2 people)': {
      calculationMethod: 'per-person',
      drinks: {
        type: 'drink',
        quantity: 1
      },
      minimum_people: 2
    },
    'Smoke Offer Ticket includes Drink (minimum x2)': {
      calculationMethod: 'per-person',
      drinks: {
        type: 'drink',
        quantity: 1
      },
      minimum_people: 2
    }
  };

  // Extract addon orders from booking codes and item_details across all entries in a booking group
  const extractAddonOrders = (mainGuest: Guest, addOnGuests: Guest[] = []): string[] => {
    const addons: string[] = [];
    
    // Debug logging for Jill
    if (mainGuest.booker_name?.toLowerCase().includes('jill')) {
      console.log('🔍 Jill Addon Debug:', {
        mainGuest: mainGuest.item_details,
        addOnGuests: addOnGuests.map(g => g.item_details),
        addOnCount: addOnGuests.length,
        bookingCode: mainGuest.booking_code
      });
    }
    
    // Combine all booking codes and item details from the booking group
    const allGuests = [mainGuest, ...addOnGuests];
    const combinedBookingCodes = allGuests.map(g => g.booking_code || '').join(' ');
    const combinedItemDetails = allGuests.map(g => g.item_details || '').join(' ');
    const combinedText = combinedBookingCodes + ' ' + combinedItemDetails;
    
    // Match patterns like "• 3 glasses of prosecco (2 included in the deal, 1 purchased)"
    if (combinedText.includes('prosecco')) {
      const match = combinedText.match(/(\d+)\s*glasses?\s*of\s*prosecco/i);
      if (match) {
        const quantity = parseInt(match[1]);
        addons.push(`${quantity} Prosecco${quantity > 1 ? 's' : ''}`);
      }
    }
    
    // Match patterns like "• 3 portions of chips (1 included in the deal, 2 purchased)"
    if (combinedText.includes('chips') || combinedText.includes('fries')) {
      const match = combinedText.match(/(\d+)\s*portions?\s*of\s*(chips|fries)/i);
      if (match) {
        const quantity = parseInt(match[1]);
        addons.push(`${quantity} ${match[2].charAt(0).toUpperCase() + match[2].slice(1)}`);
      }
    }
    
    // Match pizza orders including "Stone Baked Garlic Pizza" from item_details
    if (combinedText.toLowerCase().includes('pizza')) {
      if (combinedText.toLowerCase().includes('stone baked garlic')) {
        addons.push('1x Stone Baked Garlic Pizza');
      } else if (combinedText.toLowerCase().includes('garlic')) {
        addons.push('Garlic Pizza');
      } else {
        const match = combinedText.match(/(\d+)\s*.*?pizza/i);
        if (match) {
          const quantity = parseInt(match[1]);
          addons.push(`${quantity} Pizza${quantity > 1 ? 's' : ''}`);
        } else {
          addons.push('Pizza');
        }
      }
    }
    
    // Match House Cocktail add-ons from item_details
    if (combinedText.toLowerCase().includes('house cocktail')) {
      const match = combinedText.match(/(\d+)\s*(?:x\s*)?house\s*cocktails?/i);
      if (match) {
        const quantity = parseInt(match[1]);
        addons.push(`${quantity} House Cocktail${quantity > 1 ? 's' : ''}`);
      } else {
        // Check for simple patterns like "House Cocktail" in item_details
        const cocktailMatches = combinedText.toLowerCase().match(/house\s*cocktail/gi);
        if (cocktailMatches) {
          addons.push(`${cocktailMatches.length} House Cocktail${cocktailMatches.length > 1 ? 's' : ''}`);
        }
      }
    }
    
    return addons;
  };

  // Utility function to detect day of week from show time or current date
  const getShowDayOfWeek = (guest: Guest): string => {
    // Try to extract day from show_time if available
    const showTime = guest.show_time?.toLowerCase() || '';
    
    // Check if show_time contains day information
    if (showTime.includes('thursday') || showTime.includes('thu')) return 'thursday';
    if (showTime.includes('friday') || showTime.includes('fri')) return 'friday';
    if (showTime.includes('saturday') || showTime.includes('sat')) return 'saturday';
    if (showTime.includes('sunday') || showTime.includes('sun')) return 'sunday';
    if (showTime.includes('monday') || showTime.includes('mon')) return 'monday';
    if (showTime.includes('tuesday') || showTime.includes('tue')) return 'tuesday';
    if (showTime.includes('wednesday') || showTime.includes('wed')) return 'wednesday';
    
    // If no day in show_time, use current date (fallback)
    const today = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[today.getDay()];
  };

  // Utility function to detect if it's evening show (7pm or 9pm)
  const isEveningShow = (guest: Guest): boolean => {
    const showTime = guest.show_time?.toLowerCase() || '';
    return showTime.includes('7pm') || showTime.includes('9pm') || 
           showTime.includes('19:00') || showTime.includes('21:00');
  };

  // Enhanced Viator detection with day/time-based logic
  const getViatorTicketType = (guest: Guest): 'prosecco-package' | 'show-only' | 'not-viator' => {
    // First check if it's actually a Viator booking
    const statusField = guest.Status || guest.status || guest.ticket_data?.Status;
    const statusStr = typeof statusField === 'object' && statusField?.value
      ? String(statusField.value).toLowerCase()
      : String(statusField || '').toLowerCase();

    const noteRaw = guest.Note || guest.note || guest.ticket_data?.Note;
    const noteStr = typeof noteRaw === 'object' && noteRaw?.value
      ? String(noteRaw.value).toLowerCase()
      : String(noteRaw || '').toLowerCase();
    
    const ticketDataStr = JSON.stringify(guest.ticket_data || {}).toLowerCase();
    const viatorField = guest.ticket_data?.Viator || '';
    
    const isViatorBooking =
      statusStr === "viator" ||
      (viatorField && viatorField.toLowerCase().includes("viator booking reference")) ||
      statusStr.includes("viator booking") ||
      (guest?.booking_source?.toLowerCase?.() === "viator");

    if (!isViatorBooking) return 'not-viator';

    // Get day and time information
    const dayOfWeek = getShowDayOfWeek(guest);
    const isEvening = isEveningShow(guest);

    // Logic: Friday/Saturday 7pm & 9pm = Show Only, Thursday = Prosecco Package
    if ((dayOfWeek === 'friday' || dayOfWeek === 'saturday') && isEvening) {
      return 'show-only';
    } else if (dayOfWeek === 'thursday') {
      return 'prosecco-package';
    }
    
    // Default for other days/times - treat as prosecco package (existing behavior)
    return 'prosecco-package';
  };

  // Generate comprehensive order summary with enhanced GYG/Viator detection and new calculation logic
  const getOrderSummary = (guest: Guest, totalGuestCount?: number, addOnGuests: Guest[] = []): string => {
    // Check for staff updated order first - highest priority
    console.log(`🔍 ORDER SUMMARY DEBUG for ${guest.booker_name}: staff_updated_order = "${guest.staff_updated_order}"`);
    if (guest.staff_updated_order?.trim()) {
      console.log(`✅ USING STAFF ORDER: "${guest.staff_updated_order}"`);
      return `STAFF UPDATED: ${guest.staff_updated_order}`;
    }

    console.log(`🔧 DEBUG: Guest ${guest.booker_name} order summary check:`, {
      hasManualOrderSummary: !!guest.ticket_data?.manual_order_summary,
      manualOrderSummary: guest.ticket_data?.manual_order_summary,
      hasManualOverride: guest.manual_override
    });

    // Check for Viator booking first
    const viatorType = getViatorTicketType(guest);
    const isViatorBooking = viatorType !== 'not-viator';
    
    // For Viator bookings, ALWAYS show "Viator" as the main order type
    if (isViatorBooking) {
      let orderSummary = "Viator";
      
      // If there's a manual order summary, add it underneath
      if (guest.ticket_data?.manual_order_summary?.trim()) {
        orderSummary += ` + ${guest.ticket_data.manual_order_summary}`;
      }
      
      console.log(`🔧 Viator booking detected for ${guest.booker_name}, showing:`, orderSummary);
      return orderSummary;
    }
    
    // If guest has manual override, use a simpler display based on extracted tickets
    if (guest.manual_override) {
      console.log(`🔧 Manual override detected for ${guest.booker_name}, using extracted tickets display`);
      const extractedTickets = guest.ticket_data?.extracted_tickets || {};
      const ticketEntries = Object.entries(extractedTickets);
      
      if (ticketEntries.length > 0) {
        return ticketEntries
          .map(([ticketType, quantity]) => `${ticketType} (×${quantity})`)
          .join(', ');
      }
      
      // Fallback to item_details if no extracted tickets
      return guest.item_details || 'No ticket information';
    }

    // Use the provided total guest count for booking groups, or fallback to individual guest count
    const guestCount = totalGuestCount || guest.total_quantity || 1;
    const orderItems: string[] = [];
    
    // Debug logging for Norman specifically
    if (guest.booker_name?.toLowerCase().includes('norman')) {
      console.log(`🔍 Norman Guest Count Debug:`, {
        bookerName: guest.booker_name,
        bookingCode: guest.booking_code,
        totalGuestCountParam: totalGuestCount,
        guestTotalQuantity: guest.total_quantity,
        finalGuestCount: guestCount,
        itemDetails: guest.item_details
      });
    }
    
    // Check for addon orders from booking group - we'll add these at the end
    const addonItems = extractAddonOrders(guest, addOnGuests);
    
    // First: Detect Smoke Offer across the whole booking group (main + add-ons)
    const allGuestsInGroup = [guest, ...addOnGuests];
    const hasSmokeOffer = allGuestsInGroup.some(g => {
      const itemDetails = g.item_details || '';
      const ticketItem = g.ticket_data?.Item || '';
      const allText = `${itemDetails} ${ticketItem}`.toLowerCase();
      return allText.includes('smoke offer');
    });
    
    if (hasSmokeOffer) {
      // Calculate drinks based on per-person for Smoke Offer
      const smokeOfferDrinks = guestCount;
      orderItems.push(`${smokeOfferDrinks} Drink${smokeOfferDrinks > 1 ? 's' : ''}`);
      console.log(`🚬 Smoke Offer detected for ${guest.booker_name}: ${smokeOfferDrinks} drinks`);
      
      // Add any additional add-ons (House Cocktails, etc.)
      if (addonItems.length > 0) {
        orderItems.push(...addonItems);
      }
      
      return orderItems.join(', ');
    }
    
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

    // Enhanced Viator detection with day/time logic (already detected above)
    
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

    // Step 2: GYG Logic (Highest Priority - but ONLY if no staff override)
    if (isGYGBooking && !guest.staff_updated_order?.trim()) {
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
      
      // Add any addon items
      if (addonItems.length > 0) {
        orderItems.push(...addonItems);
      }
      
      return orderItems.join(', ');
    }

    // Step 3: Enhanced Viator Logic with Day/Time Detection (Second Priority) 
    // Check for manual override first - if guest has been manually edited, use that data
    if (isViatorBooking) {
      console.log(`🔵 Viator booking detected for ${guest.booker_name}`);
      
      // Check if manual_order_summary exists (with or without manual_override flag)
      if (guest.ticket_data?.manual_order_summary) {
        console.log(`📝 Using manual order summary for ${guest.booker_name}:`, guest.ticket_data.manual_order_summary);
        // For Viator bookings, show "Viator" as the main order type, with additional details underneath
        const additionalDetails = guest.ticket_data.manual_order_summary;
        return additionalDetails === "Viator" ? "Viator" : `Viator\n+ ${additionalDetails}`;
      }
      
      console.log(`🔵 Standard Viator booking for ${guest.booker_name} - showing "Viator"`);
      return "Viator";
    }

    // Step 4: Check if guest has explicit ticket mappings FIRST
    const tickets = getAllTicketTypes(guest);
    const hasExplicitMapping = tickets.some(ticket => TICKET_TYPE_MAPPING[ticket.type]);
    
    if (hasExplicitMapping) {
      console.log("✅ Using Explicit Ticket Mapping Path for", guest.booker_name);
      
      // Process tickets using structured TICKET_TYPE_MAPPING with exact matching
      tickets.forEach(ticket => {
        const packageInfo = TICKET_TYPE_MAPPING[ticket.type];
        const ticketCount = ticket.quantity;
        
        if (packageInfo) {
          // Calculate drinks
          if (packageInfo.drinks) {
            let quantity;
            if (packageInfo.calculationMethod === 'per-person') {
              quantity = packageInfo.drinks.quantity * guestCount;
            } else {
              quantity = packageInfo.drinks.quantity * ticketCount;
            }
            
            if (quantity > 0) {
              const drinkName = packageInfo.drinks.type;
              orderItems.push(`${quantity} ${drinkName}${quantity > 1 && !drinkName.toLowerCase().endsWith('s') ? 's' : ''}`);
            }
          }
          
          // Calculate prosecco
          if (packageInfo.prosecco) {
            let quantity;
            if (packageInfo.calculationMethod === 'per-person') {
              quantity = packageInfo.prosecco.quantity * guestCount;
            } else {
              quantity = packageInfo.prosecco.quantity * ticketCount;
            }
            
            if (quantity > 0) {
              orderItems.push(`${quantity} Prosecco${quantity > 1 ? 's' : ''}`);
            }
          }
          
          // Calculate pizzas
          if (packageInfo.pizza && packageInfo.pizza.quantity > 0) {
            let quantity;
            if (packageInfo.calculationMethod === 'per-person') {
              quantity = Math.ceil(packageInfo.pizza.quantity * guestCount);
            } else {
              quantity = packageInfo.pizza.quantity * ticketCount;
            }
            
            if (quantity > 0) {
              orderItems.push(`${quantity} Pizza${quantity > 1 ? 's' : ''}`);
            }
          }
          
          // Calculate fries
          if (packageInfo.fries && packageInfo.fries.quantity > 0) {
            let quantity;
            if (packageInfo.calculationMethod === 'per-person') {
              quantity = Math.ceil(packageInfo.fries.quantity * guestCount);
            } else {
              quantity = packageInfo.fries.quantity * ticketCount;
            }
            
            if (quantity > 0) {
              const friesType = packageInfo.fries.type === 'loaded' ? 'Loaded Fries' : 'Fries';
              orderItems.push(`${quantity} ${friesType}`);
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
        // Add any addon items
        if (addonItems.length > 0) {
          orderItems.push(...addonItems);
        }
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
      // Add any addon items
      if (addonItems.length > 0) {
        orderItems.push(...addonItems);
      }
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
      // Add any addon items
      if (addonItems.length > 0) {
        orderItems.push(...addonItems);
      }
      return orderItems.join(', ');
    }

    if (isGrouponCocktail || isWowcherCocktail) {
      const cocktailQuantity = guestCount;
      const pizzaQuantity = Math.floor(guestCount / 2);
      const loadedFriesQuantity = Math.floor(guestCount / 2);
      
      // Debug logging for Norman specifically
      if (guest.booker_name?.toLowerCase().includes('norman')) {
        console.log(`🍸 Norman Cocktail Package Debug:`, {
          bookerName: guest.booker_name,
          bookingCode: guest.booking_code,
          totalQuantity: guest.total_quantity,
          guestCount: guestCount,
          cocktailQuantity: cocktailQuantity,
          pizzaQuantity: pizzaQuantity,
          loadedFriesQuantity: loadedFriesQuantity,
          itemDetails: guest.item_details,
          isGrouponCocktail,
          isWowcherCocktail
        });
      }
      
      orderItems.push(`${cocktailQuantity} House Cocktail${cocktailQuantity > 1 ? 's' : ''}`);
      if (pizzaQuantity > 0) orderItems.push(`${pizzaQuantity} Pizza${pizzaQuantity > 1 ? 's' : ''}`);
      if (loadedFriesQuantity > 0) orderItems.push(`${loadedFriesQuantity} Loaded Fries`);
      
      console.log("✅ Fuzzy Cocktail Path:", guest.booker_name, orderItems.join(', '));
      // Add any addon items
      if (addonItems.length > 0) {
        orderItems.push(...addonItems);
      }
      return orderItems.join(', ');
    }

    // Step 6: Default fallback
    console.log("⚠️ No valid path found for", guest.booker_name, "- using fallback");
    
    // Always add addon items at the end if they exist
    if (addonItems.length > 0) {
      orderItems.push(...addonItems);
    }
    
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

    // Third try: scan item_details and ticket_data.Item for known ticket types if no extracted tickets found
    if (tickets.length === 0) {
      const itemDetails = guest.item_details || '';
      const ticketItem = guest.ticket_data?.Item || '';
      const allItemText = `${itemDetails} ${ticketItem}`.toLowerCase();
      
      // Check against known ticket type mappings (case-insensitive)
      Object.keys(TICKET_TYPE_MAPPING).forEach(ticketType => {
        const ticketTypeLower = ticketType.toLowerCase();
        // Handle partial matches for Smoke Offer variations
        const isMatch = ticketTypeLower.includes('smoke offer') 
          ? allItemText.includes('smoke offer') 
          : allItemText.includes(ticketTypeLower);
        
        if (isMatch) {
          // Use guest.total_quantity for quantity when found in item text
          const quantity = guest.total_quantity || 1;
          // Avoid duplicating main package items as add-ons unless it's Smoke Offer
          const mainPackagePatterns = ['magic show', 'comedy', 'show ['];
          const isMainPackage = mainPackagePatterns.some(pattern => 
            allItemText.includes(pattern.toLowerCase())
          );
          
          if (!isMainPackage || ticketType.includes('Smoke Offer')) {
            tickets.push({
              type: ticketType,
              quantity
            });
            console.log(`🔍 Found ticket type "${ticketType}" in item text for ${guest.booker_name}`);
          }
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
        
        // Helper function to check if message already exists in semicolon-separated list
        const messageAlreadyExists = (existingMagic: string, newMessage: string): boolean => {
          if (!existingMagic) return false;
          const existingMessages = existingMagic.split(';').map(msg => msg.trim());
          return existingMessages.some(msg => msg === newMessage.trim());
        };

        // Helper function to truncate message to character limit
        const truncateMessage = (message: string, limit: number = 150): string => {
          if (message.length <= limit) return message;
          console.log(`⚠️ Truncating message from ${message.length} to ${limit} characters: "${message}"`);
          return message.substring(0, limit).trim();
        };

        // Extract diet information with validation
        const dietData = ticketData.DIET || ticketData.Diet || ticketData.diet;
        if (dietData && typeof dietData === 'string' && dietData.trim() !== '' && !guest.diet_info) {
          const trimmedDiet = dietData.trim();
          // Only extract if it's actually dietary information
          if (isDietaryInformation(trimmedDiet)) {
            updates.diet_info = trimmedDiet;
            guest.diet_info = trimmedDiet; // Update local state
            hasUpdates = true;
            console.log(`🥗 Found valid diet info for ${guest.booker_name}: ${guest.diet_info}`);
          } else {
            // If DIET column doesn't contain dietary keywords, move to magic_info
            console.log(`🔄 DIET column contains non-dietary content for ${guest.booker_name}, moving to magic_info: "${trimmedDiet}"`);
            const existingMagic = guest.magic_info || updates.magic_info || '';
            
            // Apply character limit
            const truncatedMessage = truncateMessage(trimmedDiet);
            console.log(`📝 Processing diet message for ${guest.booker_name} (${trimmedDiet.length} chars): "${trimmedDiet}"`);
            
            // Only add if the message doesn't already exist
            if (!messageAlreadyExists(existingMagic, truncatedMessage)) {
              const newMagicInfo = existingMagic ? `${existingMagic}; ${truncatedMessage}` : truncatedMessage;
              updates.magic_info = newMagicInfo;
              guest.magic_info = newMagicInfo; // Update local state
              hasUpdates = true;
              console.log(`✅ Added magic info from DIET for ${guest.booker_name}: "${truncatedMessage}"`);
            } else {
              console.log(`🔄 Magic message from DIET already exists for ${guest.booker_name}, skipping: "${truncatedMessage}"`);
            }
          }
        }

        // Extract magic information (messages for magicians)
        const magicData = ticketData.Magic || ticketData.MAGIC || ticketData.magic;
        if (magicData && typeof magicData === 'string' && magicData.trim() !== '') {
          const trimmedMagic = magicData.trim();
          const existingMagic = guest.magic_info || updates.magic_info || '';
          
          // Apply character limit
          const truncatedMessage = truncateMessage(trimmedMagic);
          console.log(`📝 Processing Magic column for ${guest.booker_name} (${trimmedMagic.length} chars): "${trimmedMagic}"`);
          
          // Only append if the message doesn't already exist
          if (!messageAlreadyExists(existingMagic, truncatedMessage)) {
            const newMagicInfo = existingMagic ? `${existingMagic}; ${truncatedMessage}` : truncatedMessage;
            
            updates.magic_info = newMagicInfo;
            guest.magic_info = newMagicInfo; // Update local state
            hasUpdates = true;
            console.log(`✨ Added magic info from Magic column for ${guest.booker_name}: "${truncatedMessage}"`);
          } else {
            console.log(`🔄 Magic message from Magic column already exists for ${guest.booker_name}, skipping: "${truncatedMessage}"`);
          }
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

  // Enhanced name normalization function
  const normalizeNameForMatching = (name: string): string => {
    if (!name) return '';
    
    return name
      .toLowerCase()
      .trim()
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove common punctuation
      .replace(/[.,;:'"!?-]/g, '')
      // Remove any non-alphanumeric characters except spaces
      .replace(/[^\w\s]/g, '')
      .trim();
  };

  // Fuzzy matching helper for similar names
  const isFuzzyMatch = (name1: string, name2: string, threshold: number = 0.8): boolean => {
    if (name1 === name2) return true;
    
    // Simple Levenshtein-based similarity
    const longer = name1.length > name2.length ? name1 : name2;
    const shorter = name1.length > name2.length ? name2 : name1;
    
    if (longer.length === 0) return true;
    if (shorter.length === 0) return false;
    
    // Check if shorter name is contained in longer name
    if (longer.includes(shorter)) return true;
    
    return false;
  };

  // Extract and process friendship groups from guest data
  const processFriendshipGroups = useMemo(() => {
    if (!guests || guests.length === 0) {
      return new Map<string, number[]>();
    }
    
    // Use originalIndex instead of array indices for consistent mapping
    const connections = new Map<number, Set<number>>();
    
    // First pass: Find all friend connections using originalIndex (fallback to array index when missing)
    guests.forEach((guest, index) => {
      if (!guest || !guest.ticket_data) return;

      const guestOriginalIndex = (guest as any).originalIndex ?? index;

      // Extract friends data from ticket_data
      const friendsData = (guest as any).ticket_data.Friends || (guest as any).ticket_data.friends;

      if (friendsData && typeof friendsData === 'string' && friendsData.trim() !== '') {
        const friendNames = friendsData
          .split(/[,;&]/)
          .map(name => name.trim())
          .filter(name => name.length > 0);

        friendNames.forEach(friendName => {
          const normalizedFriendName = normalizeNameForMatching(friendName);

          // Find matching guests by enhanced name matching using full name extraction
          const matchingGuestOriginalIndices = guests
            .map((g, i) => ({ guest: g, index: i }))
            .filter(({ guest }) => {
              if (!guest) return false;

              // Use the enhanced extractGuestName function instead of just booker_name
              const fullGuestName = extractGuestName(guest.booker_name, guest.ticket_data, true);
              const normalizedGuestName = normalizeNameForMatching(fullGuestName);

              // Also check the original booker_name separately
              const bookerName = guest.booker_name || '';
              const normalizedBookerName = normalizeNameForMatching(bookerName);

              const guestNameParts = normalizedGuestName.split(/\s+/).filter(part => part.length > 0);
              const bookerNameParts = normalizedBookerName.split(/\s+/).filter(part => part.length > 0);
              const searchNameParts = normalizedFriendName.split(/\s+/).filter(part => part.length > 0);

              // Helper function to check name matching
              const checkNameMatch = (targetName: string, targetParts: string[]) => {
                // Exact full name match (normalized)
                if (targetName === normalizedFriendName) return true;

                // Fuzzy match for similar names
                if (isFuzzyMatch(targetName, normalizedFriendName)) return true;

                // Check if friend name matches any combination of target's first/last names
                if (searchNameParts.length === 1) {
                  // Single word friend name should match any part of the target name
                  return targetParts.includes(normalizedFriendName);
                } else if (searchNameParts.length === 2 && targetParts.length >= 2) {
                  // Two word friend name should match first+last exactly
                  const firstLastMatch =
                    targetParts[0] === searchNameParts[0] &&
                    targetParts[targetParts.length - 1] === searchNameParts[1];
                  const lastFirstMatch =
                    targetParts[0] === searchNameParts[1] &&
                    targetParts[targetParts.length - 1] === searchNameParts[0];

                  return firstLastMatch || lastFirstMatch;
                }

                return false;
              };

              // Check both the full extracted name and the booker name
              const fullNameMatch = checkNameMatch(normalizedGuestName, guestNameParts);
              const bookerNameMatch = bookerName && checkNameMatch(normalizedBookerName, bookerNameParts);

              const isMatch = fullNameMatch || bookerNameMatch;
              
              // Debug logging for friendship detection
              if (isMatch) {
                console.log(`🤝 FRIENDSHIP MATCH: "${normalizedFriendName}" matched with guest:`, {
                  fullGuestName,
                  bookerName,
                  matchType: fullNameMatch ? 'fullName' : 'bookerName'
                });
              }

              return isMatch;
            })
            .map(({ guest, index: i }) => ((guest as any).originalIndex ?? i))
            .filter(originalIndex => originalIndex !== undefined);

          // Create bidirectional connections using originalIndex
          matchingGuestOriginalIndices.forEach(matchedOriginalIndex => {
            if (matchedOriginalIndex !== guestOriginalIndex) {
              // Add connection from current guest to matched guest
              if (!connections.has(guestOriginalIndex)) {
                connections.set(guestOriginalIndex, new Set());
              }
              connections.get(guestOriginalIndex)!.add(matchedOriginalIndex);

              // Add reverse connection
              if (!connections.has(matchedOriginalIndex)) {
                connections.set(matchedOriginalIndex, new Set());
              }
              connections.get(matchedOriginalIndex)!.add(guestOriginalIndex);
            }
          });
        });
      }
    });

    // Second pass: Create friendship groups from connections
    const groups = new Map<string, number[]>();
    const processedIndices = new Set<number>();

    // Create lookup map: originalIndex -> guest
    const guestByOriginalIndex = new Map<number, typeof guests[0]>();
    guests.forEach((guest, index) => {
      const oi = (guest as any)?.originalIndex ?? index;
      guestByOriginalIndex.set(oi, guest);
    });

    connections.forEach((connectedIndices, startIndex) => {
      if (processedIndices.has(startIndex)) return;

      // Use BFS to find all connected guests (using originalIndex)
      const groupMembers = new Set<number>([startIndex]);
      const queue = [startIndex];

      while (queue.length > 0) {
        const currentIndex = queue.shift()!;
        processedIndices.add(currentIndex);

        const currentConnections = connections.get(currentIndex);
        if (currentConnections) {
          currentConnections.forEach(connectedIndex => {
            if (!groupMembers.has(connectedIndex)) {
              groupMembers.add(connectedIndex);
              queue.push(connectedIndex);
            }
          });
        }
      }

      if (groupMembers.size > 1) {
        const memberNames = Array.from(groupMembers)
          .map(originalIndex => guestByOriginalIndex.get(originalIndex)?.booker_name)
          .filter(name => name)
          .sort()
          .join(' & ');

        // Store the originalIndex values directly (not array indices)
        groups.set(`Friends: ${memberNames}`, Array.from(groupMembers).sort((a, b) => a - b));
      }
    });

    return groups;
  }, [guests]);

  // Update friendship groups state when processed groups change
  useEffect(() => {
    if (processFriendshipGroups.size > 0) {
      setFriendshipGroups(processFriendshipGroups);
    } else {
      // Clear existing friendship groups if there are none
      setFriendshipGroups(new Map());
    }
  }, [processFriendshipGroups]);

  // Build Party Groups from friendshipGroups and manualLinks so UI can show "Linked"
  useEffect(() => {
    const newPartyGroups = new Map<string, PartyGroup>();

    const addGroup = (id: string, indices: number[]) => {
      const unique = Array.from(new Set(indices)).sort((a, b) => a - b);
      const totalGuests = unique.reduce((sum, idx) => sum + (guests[idx]?.total_quantity || 0), 0);
      const guestNames = unique.map(idx => extractGuestName(guests[idx]?.booker_name || '', guests[idx]?.ticket_data));
      newPartyGroups.set(id, {
        id,
        bookingIndices: unique,
        totalGuests,
        guestNames,
        connectionType: 'mutual'
      });
    };

    // From automatic friendships
    processFriendshipGroups.forEach((indices, label) => addGroup(label, indices));

    setPartyGroups(newPartyGroups);
  }, [processFriendshipGroups, guests]);

  // Group bookings by booking code - preserve original order, derive names when missing
  const groupedBookings = useMemo(() => {
    if (!guests || guests.length === 0) return [];
    
    const bookingGroups: BookingGroup[] = [];
    const processedIndices = new Set<number>();
    
    guests.forEach((guest, index) => {
      if (processedIndices.has(index) || !guest) return;
      const bookingCode = guest.booking_code;
      
      // Skip if no booking code at all
      if (!bookingCode) return;
      
      // Get display name - use enhanced extraction if booker_name is missing
      const displayName = guest.booker_name || extractGuestName('', guest.ticket_data);
      
      // Skip if we can't get any name at all
      if (!displayName || displayName === 'Unknown Guest') return;
      
      // Find all guests with the same booking code
      const relatedBookings = guests.map((g, i) => ({
        guest: g,
        index: i
      })).filter(({
        guest: g,
        index: i
      }) => {
        if (processedIndices.has(i) || !g || g.booking_code !== bookingCode) return false;
        
        // For grouping, also check if the display names match
        const guestDisplayName = g.booker_name || extractGuestName('', g.ticket_data);
        return guestDisplayName === displayName;
      });
      
      if (relatedBookings.length > 0) {
        // Separate main booking from add-ons based on item type patterns
        const packagePatterns = [
          'package', 'wowcher', 'groupon', 'viator', 'gyg', 'experience', 'magic show', 'comedy', 'show'
        ];
        
        let mainBooking: typeof relatedBookings[0] | null = null;
        const addOns: typeof relatedBookings = [];
        
        // Find main booking (package-type item) and separate add-ons
        relatedBookings.forEach(booking => {
          const itemDetails = (booking.guest.item_details || '').toLowerCase();
          const isPackageItem = packagePatterns.some(pattern => itemDetails.includes(pattern));
          
          if (isPackageItem && !mainBooking) {
            mainBooking = booking;
          } else {
            addOns.push(booking);
          }
        });
        
        // If no package found, use the first item as main booking
        if (!mainBooking && relatedBookings.length > 0) {
          mainBooking = relatedBookings[0];
          addOns.push(...relatedBookings.slice(1));
        }
        
        if (mainBooking) {
          // Deduplicate truly identical add-ons by comparing full ticket_data
          const deduplicatedAddOns: typeof addOns = [];
          const seenItems = new Map<string, typeof addOns[0]>();
          
          addOns.forEach(addon => {
            // Use comprehensive comparison to detect true duplicates
            const key = JSON.stringify(addon.guest.ticket_data || {});
            if (!seenItems.has(key)) {
              seenItems.set(key, addon);
              deduplicatedAddOns.push(addon);
            }
          });
          
          // Derive show time for main booking if missing - prevent add-ons from overwriting main
          if (!mainBooking.guest.show_time || mainBooking.guest.show_time === 'N/A') {
            const derivedShowTime = deriveShowTime(mainBooking.guest);
            if (derivedShowTime) {
              mainBooking.guest.show_time = normalizeShowTime(derivedShowTime);
              console.log(`📅 Derived show time "${normalizeShowTime(derivedShowTime)}" for ${mainBooking.guest.booking_code}`);
            }
            
            // If still empty, try scanning add-ons for bracketed times (one-way inheritance only)
            if (!mainBooking.guest.show_time && deduplicatedAddOns.length > 0) {
              for (const addon of deduplicatedAddOns) {
                const addonDerivedTime = deriveShowTime(addon.guest);
                if (addonDerivedTime) {
                  mainBooking.guest.show_time = normalizeShowTime(addonDerivedTime);
                  console.log(`📅 Derived show time "${normalizeShowTime(addonDerivedTime)}" for ${mainBooking.guest.booking_code} from add-on`);
                  break;
                }
              }
            }
          }
          
          // Show time inheritance: ensure add-ons inherit show time from main booking (one-way only)
          const mainShowTime = mainBooking.guest.show_time;
          if (mainShowTime) {
            deduplicatedAddOns.forEach(addon => {
              if (!addon.guest.show_time || normalizeShowTime(addon.guest.show_time) !== normalizeShowTime(mainShowTime)) {
                addon.guest.show_time = mainShowTime;
                console.log(`🔗 Inherited show time "${mainShowTime}" from main booking to add-on: ${addon.guest.item_details}`);
              }
            });
          }
          
          bookingGroups.push({
            mainBooking: mainBooking.guest,
            addOns: deduplicatedAddOns.map(rb => rb.guest),
            originalIndex: mainBooking.index,
            addOnIndices: deduplicatedAddOns.map(rb => rb.index)
          });
          
          relatedBookings.forEach(({ index }) => processedIndices.add(index));
        }
      }
    });
    
    // Sort by original index to maintain the order from the CSV file
    return bookingGroups.sort((a, b) => a.originalIndex - b.originalIndex);
  }, [guests]);

  // Filter bookings based on search and show time
  const filteredBookings = useMemo(() => {
    return groupedBookings.filter(booking => {
      if (!booking?.mainBooking) return false;
      
      // Enhanced search: check main guest name and add-on names
      let matchesSearch = false;
      if (searchTerm === '') {
        matchesSearch = true;
      } else {
        const searchLower = searchTerm.toLowerCase();
        // Check main guest name
        const mainGuestName = extractGuestName(booking.mainBooking.booker_name || '', booking.mainBooking.ticket_data);
        if (mainGuestName.toLowerCase().includes(searchLower)) {
          matchesSearch = true;
        }
        
        // Check add-on guest names
        if (!matchesSearch && booking.addOns) {
          for (const addOn of booking.addOns) {
            const addOnName = extractGuestName(addOn.booker_name || '', addOn.ticket_data);
            if (addOnName.toLowerCase().includes(searchLower)) {
              matchesSearch = true;
              break;
            }
          }
        }
        
        // Also check booking code
        if (!matchesSearch && booking.mainBooking.booking_code && booking.mainBooking.booking_code.toLowerCase().includes(searchLower)) {
          matchesSearch = true;
        }
      }
      
      // Show time filter: apply consistently regardless of search using normalized comparison
      const matchesShow = showFilter === 'all' || showFilter === '' || 
        (() => {
          const guestShowTime = booking.mainBooking.show_time || booking.mainBooking['Show time'] || '';
          // Only show guests with blank show times under "All Shows", not under specific times
          if (showFilter !== 'all' && showFilter !== '' && (!guestShowTime || guestShowTime === '')) {
            return false;
          }
          
          // Normalize both times for comparison to handle "9:00pm" vs "9pm"
          const normalizedGuestTime = normalizeShowTime(guestShowTime);
          const normalizedFilterTime = normalizeShowTime(showFilter);
          
          return guestShowTime === '' || normalizedGuestTime === normalizedFilterTime;
        })();
        
      return matchesSearch && matchesShow;
    });
  }, [groupedBookings, searchTerm, showFilter]);

  // Statistics calculations - use actual guest data
  const getTotalGuests = () => {
    // Use filtered bookings to match the current view/filter
    const filteredGuestTotal = filteredBookings.reduce((total, booking) => 
      total + (booking.mainBooking?.total_quantity || 1), 0
    );
    const walkInTotal = walkInGuests.reduce((total, guest) => total + (guest.total_quantity || 0), 0);
    return filteredGuestTotal + walkInTotal;
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
  const getTotalFoodNeeded = () => {
    const foodBreakdown = {
      pizzas: 0,
      chips: 0,
      stoneBakedPizza: 0
      // Removed drinks - causing confusion with ticket names
    };
    
    console.log('\n🍕 === STARTING FOOD CALCULATION ===');
    console.log(`Processing ${groupedBookings.length} bookings for show filter: ${showFilter}`);
    
    groupedBookings.forEach((booking, index) => {
      if (!booking.mainBooking) return;
      
      const guest = booking.mainBooking;
      console.log(`\n${index + 1}. GUEST: ${guest.booker_name}`);
      
      // Debug Alex specifically
      if (guest.booker_name?.toLowerCase().includes('alex')) {
        console.log(`🔍 ALEX DEBUG - magic_info:`, guest.magic_info);
        console.log(`🔍 ALEX DEBUG - diet_info:`, guest.diet_info);
        console.log(`🔍 ALEX DEBUG - full guest data:`, guest);
      }
      
      // Check if guest has pizza tickets in their ticket data
      const ticketData = guest.ticket_data || {};
      console.log('   Ticket data keys:', Object.keys(ticketData));
      
      // Look for pizza-related ticket fields
      Object.entries(ticketData).forEach(([key, value]) => {
        if (key.toLowerCase().includes('pizza') && value && value !== '') {
          const numValue = parseInt(String(value)) || 1;
          console.log(`   🍕 FOUND PIZZA TICKET: ${key} = ${value} (parsed as ${numValue})`);
          
          if (key.toLowerCase().includes('stone baked') || key.toLowerCase().includes('garlic')) {
            foodBreakdown.stoneBakedPizza += numValue;
          } else {
            foodBreakdown.pizzas += numValue;
          }
        }
        
        if (key.toLowerCase().includes('chips') && value && value !== '') {
          const numValue = parseInt(String(value)) || 1;
          console.log(`   🍟 FOUND CHIPS: ${key} = ${value} (parsed as ${numValue})`);
          foodBreakdown.chips += numValue;
        }
        
        // Removed drinks detection - was causing confusion with ticket names containing "drink"
      });
      
      // Also check interval_pizza_order flag
      if (guest.interval_pizza_order) {
        console.log(`   🚩 Has interval_pizza_order flag - adding 1 pizza`);
        foodBreakdown.pizzas += 1;
      }
      
      console.log(`   Running totals: Pizzas=${foodBreakdown.pizzas}, Chips=${foodBreakdown.chips}, Stone=${foodBreakdown.stoneBakedPizza}`);
    });
    
    const total = foodBreakdown.pizzas + foodBreakdown.chips + foodBreakdown.stoneBakedPizza;
    
    console.log('\n🍕 === FINAL FOOD TOTALS ===');
    console.log(`Regular Pizzas: ${foodBreakdown.pizzas}`);
    console.log(`Chips: ${foodBreakdown.chips}`);
    console.log(`Stone Baked Pizzas: ${foodBreakdown.stoneBakedPizza}`);
    console.log(`TOTAL: ${total}`);
    console.log('================================\n');
    
    return {
      total,
      breakdown: foodBreakdown
    };
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
      // When unchecking a guest, clear all their related states
      console.log(`🔄 DEBUG: Unchecking guest at index ${guestIndex}`);
      console.log(`🔄 Before uncheck - guest states:`, {
        checkedIn: checkedInGuests.has(guestIndex),
        seated: seatedGuests.has(guestIndex),
        allocated: allocatedGuests.has(guestIndex),
        hasPager: pagerAssignments.has(guestIndex),
        hasTableAllocation: guestTableAllocations.has(guestIndex)
      });
      
      newCheckedIn.delete(guestIndex);
      
      // Clear pager assignment
      const pagerNumber = pagerAssignments.get(guestIndex);
      if (pagerAssignments.has(guestIndex)) {
        const newPagerAssignments = new Map(pagerAssignments);
        newPagerAssignments.delete(guestIndex);
        setPagerAssignments(newPagerAssignments);
        if (pagerNumber) {
          console.log(`🔔 DEBUG: Released pager ${pagerNumber} during uncheck`);
        }
      }
      
      // Clear seating status
      const wasSeated = seatedGuests.has(guestIndex);
      if (seatedGuests.has(guestIndex)) {
        const newSeatedGuests = new Set(seatedGuests);
        newSeatedGuests.delete(guestIndex);
        setSeatedGuests(newSeatedGuests);
        if (wasSeated) {
          console.log(`🪑 DEBUG: Removed seated status during uncheck`);
        }
      }
      
      // Clear allocation status
      const wasAllocated = allocatedGuests.has(guestIndex);
      if (allocatedGuests.has(guestIndex)) {
        const newAllocatedGuests = new Set(allocatedGuests);
        newAllocatedGuests.delete(guestIndex);
        setAllocatedGuests(newAllocatedGuests);
        if (wasAllocated) {
          console.log(`📋 DEBUG: Removed allocated status during uncheck`);
        }
      }
      
      // Clear table allocations
      const hadTableAllocation = guestTableAllocations.has(guestIndex);
      if (guestTableAllocations.has(guestIndex)) {
        const newGuestTableAllocations = new Map(guestTableAllocations);
        newGuestTableAllocations.delete(guestIndex);
        setGuestTableAllocations(newGuestTableAllocations);
        if (hadTableAllocation) {
          console.log(`🗓️ DEBUG: Removed table allocation during uncheck`);
        }
      }
      
      console.log(`✅ DEBUG: Successfully unchecked guest ${guestIndex} (${guests[guestIndex]?.booker_name}) and cleared all states`);
      
      toast({
        title: "Guest Unchecked",
        description: "All related assignments have been cleared"
      });
    } else {
      // Checking in - check for linked groups first (auto + manual)
      const friendship = processFriendshipGroups;
      let linkedGuests: number[] = [];

      // From friendship groups
      for (const [, groupMembers] of friendship.entries()) {
        if (groupMembers.includes(guestIndex)) {
          linkedGuests = groupMembers.filter(i => i !== guestIndex && !checkedInGuests.has(i));
          break;
        }
      }

      // From manual links (if no friendship group found)
      if (linkedGuests.length === 0) {
        for (const [, groupMembers] of manualLinks.entries()) {
          if (groupMembers.includes(guestIndex)) {
            linkedGuests = groupMembers.filter(i => i !== guestIndex && !checkedInGuests.has(i));
            break;
          }
        }
      }

      
      if (linkedGuests.length > 0) {
        const guest = guests[guestIndex];
        const linkedGuestNames = linkedGuests.map(i => extractGuestName(guests[i].booker_name, guests[i].ticket_data)).join(', ');
        const currentPartySize = guest.total_quantity;
        const linkedPartySize = linkedGuests.reduce((sum, i) => sum + guests[i].total_quantity, 0);
        const newPartySize = currentPartySize + linkedPartySize;
        
        const confirmed = window.confirm(
          `${extractGuestName(guest.booker_name, guest.ticket_data)} is linked with ${linkedGuestNames}.\n\n` +
          `Would you like to check in the entire group?\n` +
          `Party size will be ${currentPartySize} + ${linkedPartySize} = ${newPartySize} guests.`
        );
        
        if (confirmed) {
          // Check in all linked guests
          linkedGuests.forEach(linkedIndex => newCheckedIn.add(linkedIndex));
          toast({
            title: "Friendship Group Checked In",
            description: `Checked in ${linkedGuests.length + 1} guests from the linked group`
          });
        } else {
          toast({
            title: "Guest Checked In",
            description: "Only this guest was checked in (linked guests remain unchecked)"
          });
        }
      }
      
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

  const handleNotesChange = (guestIndex: number, notes: string) => {
    const newNotes = new Map(guestNotes);
    if (notes.trim()) {
      newNotes.set(guestIndex, notes);
    } else {
      newNotes.delete(guestIndex);
    }
    setGuestNotes(newNotes);
  };

  const handleManualEdit = (guestIndex: number) => {
    const guest = guests[guestIndex];
    if (guest) {
      setSelectedGuestForEdit(guest);
      setEditDialogOpen(true);
    }
  };

  const handleSaveManualEdit = async (guestId: string, updates: Partial<Guest>) => {
    try {
      console.log(`🔄 SAVING GUEST: ${guestId} with updates:`, updates);
      
      const { error } = await supabase
        .from('guests')
        .update(updates)
        .eq('id', guestId);

      if (error) throw error;
      
      console.log(`✅ DATABASE UPDATE SUCCESS for guest ${guestId}`);

      // Update the guest in the local array to trigger UI update
      const guestIndex = guests.findIndex(g => g.id === guestId);
      if (guestIndex !== -1) {
        // Create a new array with the updated guest object to trigger React re-render
        const updatedGuests = guests.map((guest, index) => 
          index === guestIndex ? { ...guest, ...updates } : guest
        );
        setGuests(updatedGuests);
        console.log(`🔄 LOCAL STATE UPDATED for guest ${guestId}:`, updatedGuests[guestIndex]);
        console.log(`🔍 STAFF ORDER CHECK: staff_updated_order = "${updatedGuests[guestIndex].staff_updated_order}"`);
        
        // Force immediate re-render to ensure UI updates
        setLastSaved(new Date());
      }

      toast({
        title: "✅ Guest Updated", 
        description: updates.staff_updated_order 
          ? "Staff order override has been saved and will show immediately." 
          : "Guest information has been updated.",
      });
      
      console.log(`🎉 COMPLETE: Guest ${guestId} update process finished`);
    } catch (error) {
      console.error('❌ Error updating guest:', error);
      toast({
        title: "Error",
        description: "Failed to update guest information.",
        variant: "destructive",
      });
    }
  };
  const handleAddWalkIn = (walkInData: {
    name: string;
    count: number;
    showTime: string;
    notes?: string;
  }) => {
    const walkInIndex = 10000 + walkInGuests.length; // Walk-in guests start at index 10000
    
    const newWalkIn: Guest = {
      id: `walk-in-${Date.now()}`,
      booking_code: `WALK-${Date.now()}`,
      booker_name: walkInData.name,
      total_quantity: walkInData.count,
      show_time: walkInData.showTime,
      notes: walkInData.notes,
      is_checked_in: true, // Automatically check in walk-in guests
      pager_number: null, // No automatic pager assignment - use manual selection
      table_assignments: null,
      interval_pizza_order: false,
      interval_drinks_order: false
    };
    
    // Add the walk-in guest
    setWalkInGuests([...walkInGuests, newWalkIn]);
    
    // Check in the walk-in guest
    setCheckedInGuests(prev => new Set([...prev, walkInIndex]));
    
    toast({
      title: "Walk-in Guest Added & Checked In",
      description: `${walkInData.name} (${walkInData.count} guests) added for ${walkInData.showTime}. Use "Assign Pager" to select a pager.`
    });
  };

  // Manual link handlers
  const handleCreateManualLink = (guestIndices: number[]) => {
    const linkId = `manual-${Date.now()}`;
    const newManualLinks = new Map(manualLinks);
    newManualLinks.set(linkId, guestIndices);
    setManualLinks(newManualLinks);
    
    const guestNames = guestIndices.map(i => extractGuestName(guests[i].booker_name, guests[i].ticket_data)).join(', ');
    toast({
      title: "Manual Link Created",
      description: `Linked guests: ${guestNames}`
    });
  };

  const handleRemoveManualLink = (linkId: string) => {
    const newManualLinks = new Map(manualLinks);
    newManualLinks.delete(linkId);
    setManualLinks(newManualLinks);
    
    toast({
      title: "Manual Link Removed",
      description: "Guest link has been removed"
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
              name: extractGuestName(String(booking.mainBooking.booker_name || ''), booking.mainBooking.ticket_data),
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

  const handleTableAllocated = async (guestIndex: number, tableIds: number[]) => {
    console.log(`🔄 handleTableAllocated called for guest ${guestIndex} with tables:`, tableIds);
    
    // Update local state first
    const newAllocated = new Set(allocatedGuests);
    newAllocated.add(guestIndex);
    setAllocatedGuests(newAllocated);
    
    const newTableAllocations = new Map(guestTableAllocations);
    newTableAllocations.set(guestIndex, tableIds);
    setGuestTableAllocations(newTableAllocations);

    // Also update the individual guest record in the database for consistency
    try {
      console.log(`📡 Updating individual guest record for index ${guestIndex}`);
      
      const { error } = await supabase
        .from('guests')
        .update({
          table_assignments: tableIds,
          is_allocated: true,
          // Don't change is_seated here as that's handled separately
        })
        .eq('original_row_index', guestIndex);

      if (error) {
        console.error('❌ Failed to update guest record:', error);
        toast({
          title: "Database Sync Warning",
          description: "Local allocation successful but database sync failed",
          variant: "destructive"
        });
      } else {
        console.log(`✅ Successfully updated guest record for index ${guestIndex}`);
      }
    } catch (error) {
      console.error('❌ Error updating guest record:', error);
      toast({
        title: "Database Sync Warning", 
        description: "Local allocation successful but database sync failed",
        variant: "destructive"
      });
    }
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

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
        <h2 className="text-3xl font-bold text-gray-800">🎭 Smoke & Mirrors Theatre Check-In</h2>
        <p className="text-gray-600 mt-1">Simple guest management with pager assignment</p>
      </div>

      <CheckInActions 
        onRefreshStatus={refreshStatus} 
        onClearData={clearAllData} 
        showClearDialog={showClearDialog} 
        setShowClearDialog={setShowClearDialog}
        bookingGroups={groupedBookings}
        checkedInGuests={checkedInGuests}
        friendshipGroups={friendshipGroups}
        extractGuestName={extractGuestName}
      />

      <ManualLinkDialog
        bookingGroups={groupedBookings}
        checkedInGuests={checkedInGuests}
        manualLinks={manualLinks}
        friendshipGroups={friendshipGroups}
        extractGuestName={extractGuestName}
        onCreateLink={handleCreateManualLink}
        onRemoveLink={handleRemoveManualLink}
      />

      {(() => {
        const foodData = getTotalFoodNeeded();
        return <CheckInStats 
          totalGuests={getTotalGuests()} 
          checkedInCount={getCheckedInGuestsCount()} 
          allocatedCount={getAllocatedGuestsCount()} 
          totalPizzasNeeded={foodData.total} 
          foodBreakdown={foodData.breakdown} 
          showTimeStats={getShowTimeStats()} 
          lastSaved={lastSaved} 
        />
      })()}

      <Tabs defaultValue="checkin" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-primary/5 to-accent/5 backdrop-blur-sm border border-primary/20 shadow-lg rounded-xl p-1 h-auto">
          <TabsTrigger 
            value="checkin" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg py-3 px-6 font-semibold transition-all duration-300 hover:bg-white/50"
          >
            🎭 Check-In System
          </TabsTrigger>
          <TabsTrigger 
            value="tables" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg py-3 px-6 font-semibold transition-all duration-300 hover:bg-white/50"
          >
            🍽️ Table Management
          </TabsTrigger>
          <TabsTrigger 
            value="stats" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg py-3 px-6 font-semibold transition-all duration-300 hover:bg-white/50"
          >
            📊 Show Statistics
          </TabsTrigger>
          <TabsTrigger 
            value="seating" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg py-3 px-6 font-semibold transition-all duration-300 hover:bg-white/50"
          >
            🪑 Seating Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checkin" className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex gap-4">
              <SearchAndFilters searchTerm={searchTerm} setSearchTerm={setSearchTerm} showFilter={showFilter} setShowFilter={setShowFilter} showTimes={showTimes} />
              <WalkInGuestForm showTimes={showTimes} onAddWalkIn={handleAddWalkIn} />
            </div>
          </div>


          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <GuestTable 
              bookingGroups={filteredBookings} 
              guests={guests} 
              checkedInGuests={checkedInGuests} 
              seatedGuests={seatedGuests} 
              allocatedGuests={allocatedGuests} 
              pagerAssignments={pagerAssignments} 
              guestTableAllocations={guestTableAllocations} 
              partyGroups={partyGroups} 
              bookingComments={bookingComments} 
              guestNotes={guestNotes}
              walkInGuests={walkInGuests} 
              getOrderSummary={getOrderSummary} 
              getPackageDetails={getPackageDetails} 
              extractGuestName={extractGuestName} 
              onCheckIn={handleCheckIn} 
              onPagerAction={handlePagerAction} 
              onTableAllocate={handleTableAllocate} 
              onSeat={handleSeat} 
              onComment={handleComment} 
              onNotesChange={handleNotesChange}
              onManualEdit={handleManualEdit} 
            />
          </div>
        </TabsContent>

        <TabsContent value="seating">
          <SeatingManagement
            checkedInGuests={checkedInGuestsArray.map(guest => ({
              ...guest,
              guest: guests.find(g => g.id === guest.originalIndex.toString()) || {} as any
            }))}
            onGuestTableAssign={(guestIndex: number, tableId: string) => 
              handleTableAssign(guestIndex, `Table ${tableId}`, 1, showFilter)
            }
            onGuestTableRemove={(guestIndex: number) => 
              handlePagerRelease(guestIndex)
            }
            showTime={showFilter}
            friendshipGroups={friendshipGroups}
            onAddWalkIn={handleAddWalkIn}
            showTimes={showTimes}
          />
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
              {Object.entries(getShowTimeStats()).map(([time, count]) => (
                <div key={time} className="p-4 border rounded-lg">
                  <h4 className="font-medium text-lg">{time}</h4>
                  <p className="text-2xl font-bold text-blue-600">{count} guests</p>
                </div>
              ))}
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
                {availablePagers.filter(id => !Array.from(pagerAssignments.values()).includes(id)).map(pagerId => (
                  <Button key={pagerId} variant="outline" onClick={() => {
                    const newAssignments = new Map(pagerAssignments);
                    newAssignments.set(selectedGuestForPager, pagerId);
                    setPagerAssignments(newAssignments);
                    setSelectedGuestForPager(null);
                  }} className="h-12 text-lg font-bold">
                    #{pagerId}
                  </Button>
                ))}
              </div>
            </div>}
        </DialogContent>
      </Dialog>

      {/* Manual Edit Dialog */}
      <ManualEditDialog
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        guest={selectedGuestForEdit}
        onSave={handleSaveManualEdit}
      />
    </div>
  );
};
export default CheckInSystem;
