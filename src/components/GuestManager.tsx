
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
  interval_pizza_order?: boolean;
  interval_drinks_order?: boolean;
  diet_info?: string;
  magic_info?: string;
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
      console.log(`Fetching guests for guest list: ${activeGuestList.id} (${activeGuestList.name})`);
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
            console.log('Real-time update detected, refetching guests...');
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
    console.log('Fetching guest lists...');
    const { data, error } = await supabase
      .from('guest_lists')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching guest lists:', error);
      toast({
        title: "Error",
        description: "Failed to load guest lists",
        variant: "destructive",
      });
    } else {
      console.log(`Found ${data?.length || 0} guest lists:`, data);
      setGuestLists(data || []);
      if (data && data.length > 0 && !activeGuestList) {
        console.log(`Setting active guest list to: ${data[0].name}`);
        setActiveGuestList(data[0]);
      }
    }
  };

  const fetchGuests = async (guestListId: string) => {
    try {
      console.log('🔄 Fetching guests for list:', guestListId);
      
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('guest_list_id', guestListId);

      if (error) {
        console.error('❌ Supabase error fetching guests:', error);
        toast({
          title: "Error",
          description: `Failed to load guests: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Raw guests data from database:', data?.slice(0, 2));
      console.log(`📊 Loaded ${data?.length || 0} guests successfully`);
      
      // Log ticket_data structure for debugging
      if (data && data.length > 0) {
        const sampleGuest = data[0];
        console.log('📋 Sample guest ticket_data structure:', {
          guestName: sampleGuest.booker_name,
          ticketDataType: typeof sampleGuest.ticket_data,
          ticketDataKeys: sampleGuest.ticket_data ? Object.keys(sampleGuest.ticket_data) : 'null',
          hasValidTicketData: sampleGuest.ticket_data && typeof sampleGuest.ticket_data === 'object' && !Array.isArray(sampleGuest.ticket_data),
          dietInfo: sampleGuest.diet_info,
          magicInfo: sampleGuest.magic_info
        });
      }

      setGuests(data || []);
    } catch (error) {
      console.error('❌ Unexpected error fetching guests:', error);
      toast({
        title: "Error",
        description: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleGuestListCreated = async (newGuestList: GuestList) => {
    console.log('New guest list created:', newGuestList);
    setGuestLists(prev => [newGuestList, ...prev]);
    setActiveGuestList(newGuestList);
    setShowUpload(false);
    
    // Clear any conflicting session data for the same date but different guest list
    if (user?.id) {
      try {
        const today = new Date().toISOString().split('T')[0];
        await supabase
          .from('checkin_sessions')
          .delete()
          .eq('user_id', user.id)
          .eq('session_date', today)
          .neq('guest_list_id', newGuestList.id);
        
        console.log('Cleared conflicting session data for new guest list');
      } catch (error) {
        console.error('Error clearing conflicting session data:', error);
      }
    }
  };

  const handleGuestListSelection = async (selectedList: GuestList) => {
    if (activeGuestList?.id === selectedList.id) return;
    
    console.log('Switching to guest list:', selectedList.name);
    setActiveGuestList(selectedList);
    
    // Show notification when switching to a different guest list
    if (activeGuestList) {
      toast({
        title: "📋 Guest List Changed", 
        description: `Switched to "${selectedList.name}". Previous check-in data will be preserved.`,
      });
    }
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
    // Transform guests data for CheckInSystem
    const transformedGuests = guests.map((guest, index) => {
      const ticketData = guest.ticket_data;
      const isValidObject = ticketData && typeof ticketData === 'object' && !Array.isArray(ticketData);
      
      // Debug logging for first few guests
      if (index < 3) {
        console.log(`🔄 Transforming guest ${index}: ${guest.booker_name}`, {
          hasTicketData: !!ticketData,
          ticketDataType: typeof ticketData,
          isValidObject,
          ticketDataSample: isValidObject ? Object.keys(ticketData).slice(0, 5) : 'invalid',
          dietInfo: guest.diet_info,
          magicInfo: guest.magic_info
        });
      }
      
      return {
        ...(isValidObject ? ticketData : {}),
        id: guest.id,
        booking_code: guest.booking_code,
        booker_name: guest.booker_name,
        total_quantity: guest.total_quantity,
        is_checked_in: guest.is_checked_in,
        pager_number: guest.pager_number,
        table_assignments: guest.table_assignments,
        show_time: guest.show_time,
        interval_pizza_order: guest.interval_pizza_order,
        interval_drinks_order: guest.interval_drinks_order,
        // Preserve diet and magic info that's already extracted
        diet_info: guest.diet_info,
        magic_info: guest.magic_info,
        // Pass through ticket_data for the CheckInSystem to process
        ticket_data: ticketData
      };
    });

    // Fix headers calculation to use the same validation logic
    const firstGuestTicketData = guests[0]?.ticket_data;
    const isFirstGuestDataValid = firstGuestTicketData && typeof firstGuestTicketData === 'object' && !Array.isArray(firstGuestTicketData);
    const headers = guests.length > 0 ? Object.keys(isFirstGuestDataValid ? firstGuestTicketData : {}) : [];

    // Get unique show times and sort them
    const showTimes = [...new Set(transformedGuests.map(g => g.show_time).filter(Boolean))].sort();

    console.log('Transformed guests for CheckInSystem:', transformedGuests.slice(0, 2));
    console.log('Headers for CheckInSystem:', headers);
    console.log('Available show times:', showTimes);

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
          guests={transformedGuests}
          headers={headers}
          showTimes={showTimes}
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

        {/* Quick Actions Section */}
        {activeGuestList && guests.length > 0 && (
          <div className="mb-6 p-4 bg-card rounded-lg border">
            <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
            <div className="flex gap-3">
              <Button onClick={() => setShowCheckIn(true)} className="flex-1">
                Open Check-In System
              </Button>
              <Button variant="outline" onClick={() => setShowUpload(true)} className="flex-1">
                Upload New List
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Guest Lists</h2>
                {(!activeGuestList || guests.length === 0) && (
                  <Button onClick={() => setShowUpload(true)}>
                    Upload New List
                  </Button>
                )}
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
                    onClick={() => handleGuestListSelection(list)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{list.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(list.uploaded_at).toLocaleDateString()} - {new Date(list.uploaded_at).toLocaleTimeString()}
                        </p>
                      </div>
                      {new Date(list.uploaded_at) > new Date(Date.now() - 2 * 60 * 60 * 1000) && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          New
                        </span>
                      )}
                    </div>
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
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCheckIn(true)}
                    className="hidden md:block"
                  >
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
