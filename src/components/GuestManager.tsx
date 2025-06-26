
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import CsvUpload from './CsvUpload';
import CheckInSystem from './CheckInSystem';
import { LogOut, Users } from 'lucide-react';

interface GuestList {
  id: string;
  name: string;
  uploaded_at: string;
  uploaded_by: string;
  is_active: boolean;
}

interface Guest {
  id: string;
  booking_code: string;
  booker_name: string;
  total_quantity: number;
  show_time: string;
  item_details: string;
  notes: string;
  ticket_data: any;
  is_checked_in: boolean;
  pager_number: number;
  is_seated: boolean;
  table_assignments: number[];
}

const GuestManager = () => {
  const [guestLists, setGuestLists] = useState<GuestList[]>([]);
  const [activeGuestList, setActiveGuestList] = useState<GuestList | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const { signOut, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchGuestLists();
  }, []);

  useEffect(() => {
    if (activeGuestList) {
      fetchGuests(activeGuestList.id);
      
      // Set up real-time subscription for guests
      const channel = supabase
        .channel('guests-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'guests',
            filter: `guest_list_id=eq.${activeGuestList.id}`
          },
          () => {
            fetchGuests(activeGuestList.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeGuestList]);

  const fetchGuestLists = async () => {
    const { data, error } = await supabase
      .from('guest_lists')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load guest lists",
        variant: "destructive",
      });
    } else {
      setGuestLists(data || []);
      if (data && data.length > 0 && !activeGuestList) {
        setActiveGuestList(data[0]);
      }
    }
  };

  const fetchGuests = async (guestListId: string) => {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('guest_list_id', guestListId)
      .order('original_row_index');

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load guests",
        variant: "destructive",
      });
    } else {
      setGuests(data || []);
    }
  };

  const handleGuestListCreated = (newGuestList: GuestList) => {
    setGuestLists(prev => [newGuestList, ...prev]);
    setActiveGuestList(newGuestList);
    setShowUpload(false);
  };

  if (showUpload) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Button 
            variant="outline" 
            onClick={() => setShowUpload(false)}
          >
            ← Back to Dashboard
          </Button>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <CsvUpload onGuestListCreated={handleGuestListCreated} />
      </div>
    );
  }

  if (showCheckIn && activeGuestList && guests.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Button 
            variant="outline" 
            onClick={() => setShowCheckIn(false)}
          >
            ← Back to Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {activeGuestList.name}
            </span>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CheckInSystem 
          guests={guests.map(guest => ({
            ...guest.ticket_data,
            id: guest.id,
            booking_code: guest.booking_code,
            booker_name: guest.booker_name,
            total_quantity: guest.total_quantity,
            is_checked_in: guest.is_checked_in,
            pager_number: guest.pager_number,
            table_assignments: guest.table_assignments
          }))}
          headers={guests.length > 0 ? Object.keys(guests[0].ticket_data || {}) : []}
          guestListId={activeGuestList.id}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Theatre Seating Dashboard</h1>
            <p className="text-xl text-muted-foreground">
              Welcome back, {user?.user_metadata?.full_name || user?.user_metadata?.username}
            </p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Guest Lists</h2>
                <Button onClick={() => setShowUpload(true)}>
                  Upload New List
                </Button>
              </div>
              
              <div className="space-y-2">
                {guestLists.map((list) => (
                  <div
                    key={list.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      activeGuestList?.id === list.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent'
                    }`}
                    onClick={() => setActiveGuestList(list)}
                  >
                    <h3 className="font-medium">{list.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(list.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                
                {guestLists.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No guest lists uploaded yet</p>
                    <p className="text-sm">Upload your first CSV file to get started</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            {activeGuestList && guests.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">{activeGuestList.name}</h2>
                  <Button onClick={() => setShowCheckIn(true)}>
                    Open Check-In System
                  </Button>
                </div>
                
                <div className="bg-card p-6 rounded-lg border">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{guests.length}</div>
                      <div className="text-sm text-muted-foreground">Total Guests</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {guests.filter(g => g.is_checked_in).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Checked In</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {guests.filter(g => g.is_seated).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Seated</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">
                        {guests.filter(g => g.is_checked_in && !g.is_seated).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Awaiting Seating</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <h2 className="text-xl font-semibold mb-2">
                  {activeGuestList ? 'Loading guests...' : 'Select a guest list'}
                </h2>
                <p>
                  {activeGuestList 
                    ? 'Please wait while we load the guest data'
                    : 'Choose a guest list from the left panel to view details'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestManager;
