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
// Simplified check-in system without external components to avoid type conflicts
import type { Guest } from './checkin/types';

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
  const [checkInSessions, setCheckInSessions] = useState<any[]>([]);
	const [isWalkInFormOpen, setIsWalkInFormOpen] = useState(false);
  const [walkInGuests, setWalkInGuests] = useState<any[]>([]);
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
      // Walk-in guests are stored in checkin_sessions.walk_in_guests as JSONB
      const { data: sessionData, error: walkInError } = await supabase
        .from('checkin_sessions')
        .select('walk_in_guests')
				.eq('guest_list_id', guestListId);

      if (walkInError) {
        console.error('Error fetching walk-in guests:', walkInError);
        toast({
          title: "Error",
          description: "Failed to load walk-in guests",
          variant: "destructive",
        });
      } else {
        // Extract walk-in guests from all sessions
        const allWalkIns = sessionData?.flatMap(session => 
          Array.isArray(session.walk_in_guests) ? session.walk_in_guests : []
        ) || [];
        setWalkInGuests(allWalkIns);
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
      // Check if guest already has a checkin session
      const { data: existingSession, error: sessionError } = await supabase
        .from('checkin_sessions')
        .select('*')
        .eq('guest_list_id', guestListId)
        .contains('checked_in_guests', [guests.findIndex(g => g.id === guest.id)])
        .maybeSingle();

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
      // Update guest status directly since checkin_sessions table structure has changed
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Check-In Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{guests.length}</div>
                <div className="text-sm text-muted-foreground">Total Guests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{guests.filter(g => g.is_checked_in).length}</div>
                <div className="text-sm text-muted-foreground">Checked In</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{guests.filter(g => g.is_seated).length}</div>
                <div className="text-sm text-muted-foreground">Seated</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search guests..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>
              <Select value={selectedShowTime || 'all'} onValueChange={(value) => setSelectedShowTime(value === 'all' ? null : value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by show time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shows</SelectItem>
                  {showTimes.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Guest List */}
        <Card>
          <CardHeader>
            <CardTitle>Guest List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredGuests.map((guest, index) => (
                <div key={guest.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{guest.booker_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {guest.booking_code} • {guest.show_time} • {guest.total_quantity} guests
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {guest.is_checked_in ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Checked In
                      </Badge>
                    ) : (
                      <Button 
                        onClick={() => handleCheckIn(guest)}
                        disabled={isCheckingIn}
                        size="sm"
                      >
                        Check In
                      </Button>
                    )}
                    {guest.is_seated ? (
                      <Badge variant="secondary">
                        <User className="h-3 w-3 mr-1" />
                        Seated
                      </Badge>
                    ) : guest.is_checked_in ? (
                      <Button 
                        onClick={() => handleSeatGuest(guest)}
                        disabled={isSeating}
                        size="sm"
                        variant="outline"
                      >
                        Seat
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheckInSystem;
