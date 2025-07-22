import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Users, Clock, ArrowRight, ArrowDown, ArrowUp, User, UserPlus, Edit, Link2, CheckCircle, XCircle, AlertCircle, Hash, Coffee, Pizza, Calendar } from 'lucide-react';
import SearchAndFilters from './checkin/SearchAndFilters';
import GuestTable from './checkin/GuestTable';
import CheckInStats from './checkin/CheckInStats';
import CheckInActions from './checkin/CheckInActions';
import WalkInGuestForm from './checkin/WalkInGuestForm';
import ManualEditDialog from './checkin/ManualEditDialog';
import ManualLinkDialog from './checkin/ManualLinkDialog';
import type { Guest, CheckInSession, WalkInGuest } from './checkin/types';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShowTime, setSelectedShowTime] = useState<string | null>(null);
  const [checkInSessions, setCheckInSessions] = useState<CheckInSession[]>([]);
	const [isWalkInFormOpen, setIsWalkInFormOpen] = useState(false);
  const [walkInGuests, setWalkInGuests] = useState<WalkInGuest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [isManualEditOpen, setIsManualEditOpen] = useState(false);
  const [isManualLinkOpen, setIsManualLinkOpen] = useState(false);
  const [selectedGuestToLink, setSelectedGuestToLink] = useState<Guest | null>(null);
  const [linkingGuestId, setLinkingGuestId] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isSeating, setIsSeating] = useState(false);
  const [isUnseating, setIsUnseating] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState('check-in');
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
      // Format as "July 26, 2025 (Saturday)"
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

  useEffect(() => {
    fetchCheckInSessions();
		fetchWalkInGuests();
  }, []);

  useEffect(() => {
    if (selectedGuest) {
      setNotes(selectedGuest.notes || '');
    }
  }, [selectedGuest]);

  const fetchCheckInSessions = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('checkin_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('session_date', today)
        .eq('guest_list_id', guestListId);

      if (error) {
        console.error('Error fetching check-in sessions:', error);
        toast({
          title: "Error",
          description: "Failed to load check-in sessions",
          variant: "destructive",
        });
      } else {
        setCheckInSessions(data || []);
      }
    } catch (error) {
      console.error('Error fetching check-in sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load check-in sessions",
        variant: "destructive",
      });
    }
  };

	const fetchWalkInGuests = async () => {
    try {
      const { data: walkInData, error: walkInError } = await supabase
        .from('walk_in_guests')
        .select('*')
				.eq('guest_list_id', guestListId);

      if (walkInError) {
        console.error('Error fetching walk-in guests:', walkInError);
        toast({
          title: "Error",
          description: "Failed to load walk-in guests",
          variant: "destructive",
        });
      } else {
        setWalkInGuests(walkInData || []);
      }
    } catch (error) {
      console.error('Error fetching walk-in guests:', error);
      toast({
        title: "Error",
        description: "Failed to load walk-in guests",
        variant: "destructive",
      });
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleShowTimeChange = (value: string | null) => {
    setSelectedShowTime(value);
  };

  const filteredGuests = useMemo(() => {
    let filtered = [...guests];

    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (guest) =>
          guest.booker_name?.toLowerCase().includes(lowerCaseQuery) ||
          guest.booking_code?.toLowerCase().includes(lowerCaseQuery) ||
          Object.values(guest).some(value =>
            typeof value === 'string' && value.toLowerCase().includes(lowerCaseQuery)
          )
      );
    }

    if (selectedShowTime && selectedShowTime !== 'all') {
      filtered = filtered.filter((guest) => guest.show_time === selectedShowTime);
    }

    return filtered;
  }, [guests, searchQuery, selectedShowTime]);

  const handleCheckIn = async (guest: Guest) => {
    setIsCheckingIn(true);
    try {
      const { data: existingSession, error: sessionError } = await supabase
        .from('checkin_sessions')
        .select('*')
        .eq('guest_id', guest.id)
        .single();

      if (sessionError && sessionError.code !== 'PGRST116') {
        console.error('Error checking for existing session:', sessionError);
        toast({
          title: "Error",
          description: "Failed to check existing session",
          variant: "destructive",
        });
        return;
      }

      if (existingSession) {
        toast({
          title: "Info",
          description: `${guest.booker_name} already checked in.`,
        });
        return;
      }

      const { data, error } = await supabase
        .from('guests')
        .update({ is_checked_in: true })
        .eq('id', guest.id)
        .select('*')
        .single();

      if (error) {
        console.error('Error checking in guest:', error);
        toast({
          title: "Error",
          description: "Failed to check in guest",
          variant: "destructive",
        });
      } else {
        const today = new Date().toISOString().split('T')[0];
        const { error: insertError } = await supabase
          .from('checkin_sessions')
          .insert([
            {
              guest_id: guest.id,
              user_id: user?.id,
              session_date: today,
              guest_list_id: guestListId,
            },
          ]);

        if (insertError) {
          console.error('Error creating check-in session:', insertError);
          toast({
            title: "Error",
            description: "Failed to create check-in session",
            variant: "destructive",
          });
        } else {
          setCheckInSessions(prev => [...prev, {
            id: data.id,
            guest_id: guest.id,
            user_id: user?.id || '',
            session_date: today,
            guest_list_id: guestListId,
            created_at: new Date().toISOString(),
          }]);
          toast({
            title: "Success",
            description: `${guest.booker_name} checked in successfully!`,
          });
        }
      }
    } catch (error) {
      console.error('Error during check-in process:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during check-in",
        variant: "destructive",
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleUndoCheckIn = async (guest: Guest) => {
    setIsCheckingIn(true);
    try {
      const { error: deleteError } = await supabase
        .from('checkin_sessions')
        .delete()
        .eq('guest_id', guest.id);

      if (deleteError) {
        console.error('Error deleting check-in session:', deleteError);
        toast({
          title: "Error",
          description: "Failed to undo check-in",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('guests')
        .update({ is_checked_in: false })
        .eq('id', guest.id);

      if (error) {
        console.error('Error undoing check-in for guest:', error);
        toast({
          title: "Error",
          description: "Failed to undo check-in",
          variant: "destructive",
        });
      } else {
        setCheckInSessions(prev => prev.filter(session => session.guest_id !== guest.id));
        toast({
          title: "Success",
          description: `Check-in undone for ${guest.booker_name}.`,
        });
      }
    } catch (error) {
      console.error('Error during undo check-in process:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during undo check-in",
        variant: "destructive",
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleSeatGuest = async (guest: Guest) => {
    setIsSeating(true);
    try {
      const { error } = await supabase
        .from('guests')
        .update({ is_seated: true })
        .eq('id', guest.id);

      if (error) {
        console.error('Error seating guest:', error);
        toast({
          title: "Error",
          description: "Failed to seat guest",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `${guest.booker_name} seated successfully!`,
        });
      }
    } catch (error) {
      console.error('Error during seating process:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during seating",
        variant: "destructive",
      });
    } finally {
      setIsSeating(false);
    }
  };

  const handleUnseatGuest = async (guest: Guest) => {
    setIsUnseating(true);
    try {
      const { error } = await supabase
        .from('guests')
        .update({ is_seated: false })
        .eq('id', guest.id);

      if (error) {
        console.error('Error unseating guest:', error);
        toast({
          title: "Error",
          description: "Failed to unseat guest",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `${guest.booker_name} unseated successfully!`,
        });
      }
    } catch (error) {
      console.error('Error during unseating process:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during unseating",
        variant: "destructive",
      });
    } finally {
      setIsUnseating(false);
    }
  };

  const handleOpenManualEdit = (guest: Guest) => {
    setSelectedGuest(guest);
    setIsManualEditOpen(true);
  };

  const handleCloseManualEdit = () => {
    setIsManualEditOpen(false);
    setSelectedGuest(null);
  };

  const handleOpenManualLink = (guest: Guest) => {
    setSelectedGuestToLink(guest);
    setIsManualLinkOpen(true);
  };

  const handleCloseManualLink = () => {
    setIsManualLinkOpen(false);
    setSelectedGuestToLink(null);
    setLinkingGuestId(null);
  };

  const handleLinkGuest = async () => {
    if (!selectedGuestToLink || !linkingGuestId) {
      toast({
        title: "Error",
        description: "Please select a guest to link.",
        variant: "destructive",
      });
      return;
    }

    setIsLinking(true);
    try {
      const { error } = await supabase
        .from('guests')
        .update({ ticket_data: { linked_guest_id: linkingGuestId } })
        .eq('id', selectedGuestToLink.id);

      if (error) {
        console.error('Error linking guest:', error);
        toast({
          title: "Error",
          description: "Failed to link guest",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Guest ${selectedGuestToLink.booker_name} linked successfully!`,
        });
        handleCloseManualLink();
      }
    } catch (error) {
      console.error('Error during linking process:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during linking",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkGuest = async (guest: Guest) => {
    setIsUnlinking(true);
    try {
      const { error } = await supabase
        .from('guests')
        .update({ ticket_data: { linked_guest_id: null } })
        .eq('id', guest.id);

      if (error) {
        console.error('Error unlinking guest:', error);
        toast({
          title: "Error",
          description: "Failed to unlink guest",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `Guest ${guest.booker_name} unlinked successfully!`,
        });
      }
    } catch (error) {
      console.error('Error during unlinking process:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during unlinking",
        variant: "destructive",
      });
    } finally {
      setIsUnlinking(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedGuest) return;

    setIsSavingNotes(true);
    try {
      const { error } = await supabase
        .from('guests')
        .update({ notes: notes })
        .eq('id', selectedGuest.id);

      if (error) {
        console.error('Error saving notes:', error);
        toast({
          title: "Error",
          description: "Failed to save notes",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Notes saved successfully!",
        });
      }
    } catch (error) {
      console.error('Error during saving notes process:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during saving notes",
        variant: "destructive",
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Event Date */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">🎭 Smoke & Mirrors Theatre Check-In</h1>
          <div className="flex items-center justify-center gap-2 text-lg text-muted-foreground">
            <Calendar className="h-5 w-5" />
            <span>{formatEventDate(eventDate)}</span>
          </div>
        </div>

        {/* Stats Section */}
        <CheckInStats guests={guests} checkInSessions={checkInSessions} walkInGuests={walkInGuests} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="check-in">Check-In</TabsTrigger>
            <TabsTrigger value="walk-ins">Walk-Ins</TabsTrigger>
          </TabsList>
          <TabsContent value="check-in" className="space-y-4">
            {/* Search and Filters */}
            <SearchAndFilters
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              showTimes={showTimes}
              selectedShowTime={selectedShowTime}
              onShowTimeChange={handleShowTimeChange}
            />

            {/* Guest Table */}
            <GuestTable
              guests={filteredGuests}
              headers={headers}
              checkInSessions={checkInSessions}
              onCheckIn={handleCheckIn}
              onUndoCheckIn={handleUndoCheckIn}
              onSeatGuest={handleSeatGuest}
              onUnseatGuest={handleUnseatGuest}
              onOpenManualEdit={handleOpenManualEdit}
              onOpenManualLink={handleOpenManualLink}
              isCheckingIn={isCheckingIn}
              isSeating={isSeating}
              isUnseating={isUnseating}
              isLinking={isLinking}
              isUnlinking={isUnlinking}
            />
          </TabsContent>

					<TabsContent value="walk-ins" className="space-y-4">
            <WalkInGuestForm 
							guestListId={guestListId}
							onGuestCreated={fetchWalkInGuests}
						/>
          </TabsContent>
        </Tabs>

        {/* Manual Edit Dialog */}
        <ManualEditDialog
          isOpen={isManualEditOpen}
          onClose={handleCloseManualEdit}
          guest={selectedGuest}
          onSaveNotes={handleSaveNotes}
          notes={notes}
          setNotes={setNotes}
          isSavingNotes={isSavingNotes}
        />

        {/* Manual Link Dialog */}
        <ManualLinkDialog
          isOpen={isManualLinkOpen}
          onClose={handleCloseManualLink}
          guest={selectedGuestToLink}
          linkingGuestId={linkingGuestId}
          setLinkingGuestId={setLinkingGuestId}
          onLinkGuest={handleLinkGuest}
        />
      </div>
    </div>
  );
};

export default CheckInSystem;
