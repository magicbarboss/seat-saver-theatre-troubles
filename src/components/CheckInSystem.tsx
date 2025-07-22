
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, MessageSquare, RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import { SearchAndFilters } from './checkin/SearchAndFilters';
import { GuestTable } from './checkin/GuestTable';
import { CheckInStats } from './checkin/CheckInStats';
import { CheckInActions } from './checkin/CheckInActions';
import { WalkInGuestForm } from './checkin/WalkInGuestForm';
import { ManualEditDialog } from './checkin/ManualEditDialog';
import { ManualLinkDialog } from './checkin/ManualLinkDialog';
import type { Guest, BookingGroup, CheckedInGuest, PartyGroup } from './checkin/types';

interface CheckInSystemProps {
  guests: Guest[];
  headers: string[];
  showTimes: string[];
  guestListId: string;
  eventDate?: string;
}

const CheckInSystem: React.FC<CheckInSystemProps> = ({ 
  guests, 
  headers, 
  showTimes, 
  guestListId,
  eventDate 
}) => {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState('all');
  const [checkedInGuests, setCheckedInGuests] = useState<Set<number>>(new Set());
  const [seatedGuests, setSeatedGuests] = useState<Set<number>>(new Set());
  const [allocatedGuests, setAllocatedGuests] = useState<Set<number>>(new Set());
  const [pagerAssignments, setPagerAssignments] = useState<Map<number, number>>(new Map());
  const [guestTableAllocations, setGuestTableAllocations] = useState<Map<number, number[]>>(new Map());
  const [partyGroups, setPartyGroups] = useState<Map<string, PartyGroup>>(new Map());
  const [bookingComments, setBookingComments] = useState<Map<number, string>>(new Map());
  const [walkInGuests, setWalkInGuests] = useState<Guest[]>([]);
  const [manualLinks, setManualLinks] = useState<Map<string, number[]>>(new Map());
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [selectedGuestIndex, setSelectedGuestIndex] = useState<number | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [manualEditDialogOpen, setManualEditDialogOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [lastSaved, setLastSaved] = useState(new Date());

  const { toast } = useToast();
  const { user } = useAuth();

  // Format event date for display
  const formatEventDate = (dateString?: string) => {
    if (!dateString) return 'Date not available';
    
    try {
      const date = new Date(dateString);
      const options: Intl.DateTimeFormatOptions = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
      };
      const formatted = date.toLocaleDateString('en-US', options);
      const parts = formatted.split(', ');
      if (parts.length >= 3) {
        const dayOfWeek = parts[0];
        const monthDay = parts[1];
        const year = parts[2];
        return `${monthDay}, ${year} (${dayOfWeek})`;
      }
      return formatted;
    } catch (error) {
      console.error('Error formatting event date:', error);
      return 'Invalid date';
    }
  };

  // Load saved data on component mount
  useEffect(() => {
    loadCheckInData();
    const interval = setInterval(saveCheckInData, 30000); // Auto-save every 30 seconds
    return () => clearInterval(interval);
  }, [guestListId]);

  const loadCheckInData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('checkin_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('session_date', today)
        .eq('guest_list_id', guestListId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading check-in data:', error);
        return;
      }

      if (data) {
        setCheckedInGuests(new Set(data.checked_in_guests || []));
        setSeatedGuests(new Set(data.seated_guests || []));
        setAllocatedGuests(new Set(data.allocated_guests || []));
        setPagerAssignments(new Map(Object.entries(data.pager_assignments || {}).map(([k, v]) => [parseInt(k), v as number])));
        setGuestTableAllocations(new Map(Object.entries(data.guest_table_allocations || {}).map(([k, v]) => [parseInt(k), v as number[]])));
        setPartyGroups(new Map(Object.entries(data.party_groups || {})));
        setBookingComments(new Map(Object.entries(data.booking_comments || {}).map(([k, v]) => [parseInt(k), v as string])));
        setWalkInGuests(Array.isArray(data.walk_in_guests) ? data.walk_in_guests : []);
      }
    } catch (error) {
      console.error('Error loading check-in data:', error);
    }
  };

  const saveCheckInData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const sessionData = {
        user_id: user?.id,
        guest_list_id: guestListId,
        session_date: today,
        checked_in_guests: Array.from(checkedInGuests),
        seated_guests: Array.from(seatedGuests),
        allocated_guests: Array.from(allocatedGuests),
        pager_assignments: Object.fromEntries(pagerAssignments),
        guest_table_allocations: Object.fromEntries(guestTableAllocations),
        party_groups: Object.fromEntries(partyGroups),
        booking_comments: Object.fromEntries(bookingComments),
        walk_in_guests: walkInGuests,
      };

      const { error } = await supabase
        .from('checkin_sessions')
        .upsert(sessionData, {
          onConflict: 'user_id,guest_list_id,session_date'
        });

      if (error) {
        console.error('Error saving check-in data:', error);
      } else {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Error saving check-in data:', error);
    }
  };

  // Process booking groups from guests
  const bookingGroups = useMemo(() => {
    const groups: BookingGroup[] = [];
    const processed = new Set<number>();

    guests.forEach((guest, index) => {
      if (processed.has(index)) return;

      const mainBooking = guest;
      const addOns: Guest[] = [];
      const addOnIndices: number[] = [];

      // Find related bookings (same booking code)
      if (guest.booking_code) {
        guests.forEach((otherGuest, otherIndex) => {
          if (otherIndex !== index && 
              otherGuest.booking_code === guest.booking_code && 
              !processed.has(otherIndex)) {
            addOns.push(otherGuest);
            addOnIndices.push(otherIndex);
            processed.add(otherIndex);
          }
        });
      }

      groups.push({
        mainBooking,
        addOns,
        originalIndex: index,
        addOnIndices
      });
      
      processed.add(index);
    });

    return groups;
  }, [guests]);

  // Filter booking groups based on search and show time
  const filteredBookingGroups = useMemo(() => {
    return bookingGroups.filter(group => {
      const guest = group.mainBooking;
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          guest.booker_name?.toLowerCase().includes(searchLower) ||
          guest.booking_code?.toLowerCase().includes(searchLower) ||
          Object.values(guest).some(value => 
            typeof value === 'string' && value.toLowerCase().includes(searchLower)
          );
        
        if (!matchesSearch) return false;
      }

      // Show time filter
      if (showFilter !== 'all') {
        const guestShowTime = guest.show_time || guest['Show time'] || '';
        if (guestShowTime !== showFilter) return false;
      }

      return true;
    });
  }, [bookingGroups, searchTerm, showFilter]);

  // Utility functions
  const extractGuestName = (fullName: string): string => {
    if (!fullName) return 'Unknown Guest';
    return fullName.split(/[,\-\+]|\sand\s/i)[0].trim();
  };

  const getOrderSummary = (guest: Guest, totalGuestCount?: number, addOnGuests?: Guest[]): string => {
    const ticketData = guest.ticket_data || {};
    const extractedTickets = ticketData.extracted_tickets || {};
    
    let pizzaCount = 0;
    let drinkCount = 0;
    let proseccoCount = 0;
    let chipCount = 0;
    
    // Count items from extracted tickets
    Object.entries(extractedTickets).forEach(([ticketType, quantity]) => {
      const qty = parseInt(quantity as string) || 0;
      const lowerType = ticketType.toLowerCase();
      
      if (lowerType.includes('pizza')) {
        pizzaCount += qty;
      }
      if (lowerType.includes('drink') || lowerType.includes('pint') || lowerType.includes('cocktail')) {
        drinkCount += qty;
      }
      if (lowerType.includes('prosecco')) {
        proseccoCount += qty;
      }
      if (lowerType.includes('chip')) {
        chipCount += qty;
      }
    });

    // Include add-on items if provided
    if (addOnGuests) {
      addOnGuests.forEach(addOn => {
        const addOnTicketData = addOn.ticket_data || {};
        const addOnExtracted = addOnTicketData.extracted_tickets || {};
        
        Object.entries(addOnExtracted).forEach(([ticketType, quantity]) => {
          const qty = parseInt(quantity as string) || 0;
          const lowerType = ticketType.toLowerCase();
          
          if (lowerType.includes('pizza')) {
            pizzaCount += qty;
          }
          if (lowerType.includes('drink') || lowerType.includes('pint') || lowerType.includes('cocktail')) {
            drinkCount += qty;
          }
          if (lowerType.includes('prosecco')) {
            proseccoCount += qty;
          }
          if (lowerType.includes('chip')) {
            chipCount += qty;
          }
        });
      });
    }

    const items = [];
    if (pizzaCount > 0) items.push(`${pizzaCount} Pizza${pizzaCount > 1 ? 's' : ''}`);
    if (drinkCount > 0) items.push(`${drinkCount} Drink${drinkCount > 1 ? 's' : ''}`);
    if (proseccoCount > 0) items.push(`${proseccoCount} Prosecco`);
    if (chipCount > 0) items.push(`${chipCount} Chips`);
    
    return items.length > 0 ? items.join(', ') : 'Show Only';
  };

  const getPackageDetails = (guest: Guest) => {
    const ticketData = guest.ticket_data || {};
    const extractedTickets = ticketData.extracted_tickets || {};
    
    return Object.entries(extractedTickets).map(([type, quantity]) => ({
      type,
      quantity: parseInt(quantity as string) || 0,
      details: []
    }));
  };

  // Event handlers
  const handleCheckIn = (index: number) => {
    const newCheckedIn = new Set(checkedInGuests);
    if (newCheckedIn.has(index)) {
      newCheckedIn.delete(index);
      // Also remove from seated and allocated if unchecking
      const newSeated = new Set(seatedGuested);
      const newAllocated = new Set(allocatedGuests);
      newSeated.delete(index);
      newAllocated.delete(index);
      setSeatedGuests(newSeated);
      setAllocatedGuests(newAllocated);
      toast({
        title: "Guest Unchecked",
        description: `${extractGuestName(guests[index]?.booker_name || '')} has been unchecked.`
      });
    } else {
      newCheckedIn.add(index);
      toast({
        title: "Guest Checked In",
        description: `${extractGuestName(guests[index]?.booker_name || '')} has been checked in.`
      });
    }
    setCheckedInGuests(newCheckedIn);
  };

  const handlePagerAction = (index: number, pagerNumber?: number) => {
    const newPagerAssignments = new Map(pagerAssignments);
    
    if (pagerNumber === undefined) {
      // Release pager
      newPagerAssignments.delete(index);
      toast({
        title: "Pager Released",
        description: `Pager released for ${extractGuestName(guests[index]?.booker_name || '')}`
      });
    } else {
      // Assign pager
      const nextPager = Math.max(0, ...Array.from(pagerAssignments.values())) + 1;
      newPagerAssignments.set(index, nextPager);
      toast({
        title: "Pager Assigned",
        description: `Pager ${nextPager} assigned to ${extractGuestName(guests[index]?.booker_name || '')}`
      });
    }
    
    setPagerAssignments(newPagerAssignments);
  };

  const handleTableAllocate = (index: number) => {
    const newAllocated = new Set(allocatedGuests);
    const newTableAllocations = new Map(guestTableAllocations);
    
    if (newAllocated.has(index)) {
      // Remove allocation
      newAllocated.delete(index);
      newTableAllocations.delete(index);
      toast({
        title: "Table Unallocated",
        description: `Table unallocated for ${extractGuestName(guests[index]?.booker_name || '')}`
      });
    } else {
      // Allocate table
      newAllocated.add(index);
      const tableNumber = index + 1; // Simple table assignment
      newTableAllocations.set(index, [tableNumber]);
      toast({
        title: "Table Allocated",
        description: `Table ${tableNumber} allocated to ${extractGuestName(guests[index]?.booker_name || '')}`
      });
    }
    
    setAllocatedGuests(newAllocated);
    setGuestTableAllocations(newTableAllocations);
  };

  const handleSeat = (index: number) => {
    const newSeated = new Set(seatedGuests);
    
    if (newSeated.has(index)) {
      newSeated.delete(index);
      toast({
        title: "Guest Unseated",
        description: `${extractGuestName(guests[index]?.booker_name || '')} has been unseated.`
      });
    } else {
      newSeated.add(index);
      toast({
        title: "Guest Seated",
        description: `${extractGuestName(guests[index]?.booker_name || '')} has been seated.`
      });
    }
    
    setSeatedGuests(newSeated);
  };

  const handleComment = (index: number) => {
    setSelectedGuestIndex(index);
    setCommentText(bookingComments.get(index) || '');
    setCommentDialogOpen(true);
  };

  const handleSaveComment = () => {
    if (selectedGuestIndex !== null) {
      const newComments = new Map(bookingComments);
      if (commentText.trim()) {
        newComments.set(selectedGuestIndex, commentText.trim());
      } else {
        newComments.delete(selectedGuestIndex);
      }
      setBookingComments(newComments);
      toast({
        title: "Comment Saved",
        description: "Guest comment has been saved."
      });
    }
    setCommentDialogOpen(false);
    setSelectedGuestIndex(null);
    setCommentText('');
  };

  const handleManualEdit = (index: number) => {
    setSelectedGuest(guests[index]);
    setManualEditDialogOpen(true);
  };

  const handleSaveManualEdit = async (guestId: string, updates: Partial<Guest>) => {
    try {
      const { error } = await supabase
        .from('guests')
        .update(updates)
        .eq('id', guestId);

      if (error) {
        throw error;
      }

      toast({
        title: "Guest Updated",
        description: "Guest details have been updated successfully."
      });
    } catch (error) {
      console.error('Error updating guest:', error);
      toast({
        title: "Error",
        description: "Failed to update guest details.",
        variant: "destructive"
      });
    }
  };

  const handleAddWalkIn = (walkInData: { name: string; count: number; showTime: string; notes?: string }) => {
    const newWalkIn: Guest = {
      id: `walk-in-${Date.now()}`,
      booking_code: `WI-${Date.now()}`,
      booker_name: walkInData.name,
      total_quantity: walkInData.count,
      show_time: walkInData.showTime,
      notes: walkInData.notes,
      is_checked_in: false,
      is_seated: false,
      is_allocated: false,
      pager_number: null,
      table_assignments: null,
      interval_pizza_order: false,
      interval_drinks_order: false,
      ticket_data: { extracted_tickets: {} }
    };

    setWalkInGuests(prev => [...prev, newWalkIn]);
    toast({
      title: "Walk-in Added",
      description: `${walkInData.name} has been added as a walk-in guest.`
    });
  };

  const handleCreateManualLink = (guestIndices: number[]) => {
    const linkId = `manual-link-${Date.now()}`;
    const newManualLinks = new Map(manualLinks);
    newManualLinks.set(linkId, guestIndices);
    setManualLinks(newManualLinks);
    
    toast({
      title: "Guests Linked",
      description: `${guestIndices.length} guests have been manually linked.`
    });
  };

  const handleRemoveManualLink = (linkId: string) => {
    const newManualLinks = new Map(manualLinks);
    newManualLinks.delete(linkId);
    setManualLinks(newManualLinks);
    
    toast({
      title: "Link Removed",
      description: "Manual guest link has been removed."
    });
  };

  const handleRefreshStatus = () => {
    loadCheckInData();
    toast({
      title: "Status Refreshed",
      description: "Check-in status has been refreshed from the database."
    });
  };

  const handleClearData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('checkin_sessions')
        .delete()
        .eq('user_id', user?.id)
        .eq('session_date', today)
        .eq('guest_list_id', guestListId);

      if (error) {
        throw error;
      }

      // Reset all local state
      setCheckedInGuests(new Set());
      setSeatedGuests(new Set());
      setAllocatedGuests(new Set());
      setPagerAssignments(new Map());
      setGuestTableAllocations(new Map());
      setPartyGroups(new Map());
      setBookingComments(new Map());
      setWalkInGuests([]);
      setManualLinks(new Map());

      toast({
        title: "Data Cleared",
        description: "All check-in data has been cleared successfully."
      });
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: "Error",
        description: "Failed to clear check-in data.",
        variant: "destructive"
      });
    }
    setShowClearDialog(false);
  };

  // Calculate statistics
  const totalGuests = guests.length + walkInGuests.length;
  const checkedInCount = checkedInGuests.size;
  const allocatedCount = allocatedGuests.size;
  
  // Calculate food breakdown
  const foodBreakdown = useMemo(() => {
    let pizzas = 0;
    let chips = 0;
    let stoneBakedPizza = 0;

    [...guests, ...walkInGuests].forEach(guest => {
      const ticketData = guest.ticket_data || {};
      const extractedTickets = ticketData.extracted_tickets || {};
      
      Object.entries(extractedTickets).forEach(([ticketType, quantity]) => {
        const qty = parseInt(quantity as string) || 0;
        const lowerType = ticketType.toLowerCase();
        
        if (lowerType.includes('pizza')) {
          if (lowerType.includes('stone')) {
            stoneBakedPizza += qty;
          } else {
            pizzas += qty;
          }
        }
        if (lowerType.includes('chip')) {
          chips += qty;
        }
      });
    });

    return { pizzas, chips, stoneBakedPizza };
  }, [guests, walkInGuests]);

  const totalPizzasNeeded = foodBreakdown.pizzas + foodBreakdown.chips + foodBreakdown.stoneBakedPizza;

  const showTimeStats = useMemo(() => {
    const stats: { [key: string]: number } = {};
    
    [...guests, ...walkInGuests].forEach(guest => {
      const showTime = guest.show_time || guest['Show time'] || 'Unknown';
      stats[showTime] = (stats[showTime] || 0) + (guest.total_quantity || 1);
    });

    return stats;
  }, [guests, walkInGuests]);

  return (
    <div className="space-y-6">
      {/* Header with Event Date */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">🎭 Smoke & Mirrors Theatre Check-In</h1>
        <div className="flex items-center justify-center gap-2 text-lg text-muted-foreground">
          <Calendar className="h-5 w-5" />
          <span>{formatEventDate(eventDate)}</span>
        </div>
      </div>

      {/* Statistics */}
      <CheckInStats
        totalGuests={totalGuests}
        checkedInCount={checkedInCount}
        allocatedCount={allocatedCount}
        totalPizzasNeeded={totalPizzasNeeded}
        foodBreakdown={foodBreakdown}
        showTimeStats={showTimeStats}
        lastSaved={lastSaved}
      />

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <CheckInActions
          onRefreshStatus={handleRefreshStatus}
          onClearData={handleClearData}
          showClearDialog={showClearDialog}
          setShowClearDialog={setShowClearDialog}
          bookingGroups={bookingGroups}
          checkedInGuests={checkedInGuests}
          manualLinks={manualLinks}
          onCreateManualLink={handleCreateManualLink}
          onRemoveManualLink={handleRemoveManualLink}
          extractGuestName={extractGuestName}
        />
        
        <WalkInGuestForm
          showTimes={showTimes}
          onAddWalkIn={handleAddWalkIn}
        />
      </div>

      {/* Search and Filters */}
      <SearchAndFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        showFilter={showFilter}
        setShowFilter={setShowFilter}
        showTimes={showTimes}
      />

      {/* Guest Table */}
      <Card>
        <CardHeader>
          <CardTitle>Guest List</CardTitle>
        </CardHeader>
        <CardContent>
          <GuestTable
            bookingGroups={filteredBookingGroups}
            checkedInGuests={checkedInGuests}
            seatedGuests={seatedGuests}
            allocatedGuests={allocatedGuests}
            pagerAssignments={pagerAssignments}
            guestTableAllocations={guestTableAllocations}
            partyGroups={partyGroups}
            bookingComments={bookingComments}
            walkInGuests={walkInGuests}
            getOrderSummary={getOrderSummary}
            getPackageDetails={getPackageDetails}
            extractGuestName={extractGuestName}
            onCheckIn={handleCheckIn}
            onPagerAction={handlePagerAction}
            onTableAllocate={handleTableAllocate}
            onSeat={handleSeat}
            onComment={handleComment}
            onManualEdit={handleManualEdit}
          />
        </CardContent>
      </Card>

      {/* Comment Dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add Comment for {selectedGuestIndex !== null ? extractGuestName(guests[selectedGuestIndex]?.booker_name || '') : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                id="comment"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Enter any special notes or comments..."
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCommentDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveComment}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Save Comment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Edit Dialog */}
      <ManualEditDialog
        isOpen={manualEditDialogOpen}
        onClose={() => {
          setManualEditDialogOpen(false);
          setSelectedGuest(null);
        }}
        guest={selectedGuest}
        onSave={handleSaveManualEdit}
      />
    </div>
  );
};

export default CheckInSystem;
