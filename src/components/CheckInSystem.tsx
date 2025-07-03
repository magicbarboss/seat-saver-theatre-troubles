import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Search, 
  Radio, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Utensils,
  UserCheck,
  MapPin,
  Filter,
  X
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import TableAllocation from './TableAllocation';

interface Guest {
  id?: string;
  [key: string]: any;
  booker_name?: string;
  total_quantity?: number;
  show_time?: string;
  is_checked_in?: boolean;
  pager_number?: number;
  table_assignments?: number[];
  is_seated?: boolean;
  original_row_index?: number;
  hasTableAllocated?: boolean;
  allocatedTables?: number[];
}

interface CheckInSystemProps {
  guests: Guest[];
  headers: string[];
  showTimes: string[];
  onTableAllocated: (guestIndex: number, tableIds: number[]) => void;
}

const CheckInSystem = ({ guests, headers, showTimes, onTableAllocated }: CheckInSystemProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [pagerNumber, setPagerNumber] = useState('');
  const [usedPagers, setUsedPagers] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState('checkin');
  const [showTimeFilter, setShowTimeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [partyGroups, setPartyGroups] = useState<Map<string, Guest[]>>(new Map());

  // Initialize used pagers from existing guest data
  useEffect(() => {
    const pagers = new Set<number>();
    guests.forEach(guest => {
      if (guest.pager_number && guest.is_checked_in && !guest.is_seated) {
        pagers.add(guest.pager_number);
      }
    });
    setUsedPagers(pagers);
  }, [guests]);

  // Group guests by booker name for party management
  useEffect(() => {
    const groups = new Map<string, Guest[]>();
    guests.forEach(guest => {
      const bookerName = guest.booker_name || 'Unknown';
      if (!groups.has(bookerName)) {
        groups.set(bookerName, []);
      }
      groups.get(bookerName)!.push(guest);
    });
    
    // Only keep groups with more than one guest
    const partyGroupsOnly = new Map<string, Guest[]>();
    groups.forEach((guestList, bookerName) => {
      if (guestList.length > 1) {
        partyGroupsOnly.set(bookerName, guestList);
      }
    });
    
    setPartyGroups(partyGroupsOnly);
  }, [guests]);

  const handleCheckIn = async (guest: Guest) => {
    if (!guest.id) {
      toast({
        title: "Error",
        description: "Guest ID not found",
        variant: "destructive",
      });
      return;
    }

    try {
      let assignedPager = null;
      
      if (pagerNumber.trim()) {
        const pagerNum = parseInt(pagerNumber.trim());
        if (isNaN(pagerNum) || pagerNum <= 0) {
          toast({
            title: "Invalid Pager Number",
            description: "Please enter a valid pager number",
            variant: "destructive",
          });
          return;
        }
        
        if (usedPagers.has(pagerNum)) {
          toast({
            title: "Pager Already in Use",
            description: `Pager #${pagerNum} is already assigned to another guest`,
            variant: "destructive",
          });
          return;
        }
        
        assignedPager = pagerNum;
      }

      const updateData: any = {
        is_checked_in: true,
        checked_in_at: new Date().toISOString(),
      };

      if (assignedPager) {
        updateData.pager_number = assignedPager;
      }

      if (notes.trim()) {
        updateData.notes = notes.trim();
      }

      const { error } = await supabase
        .from('guests')
        .update(updateData)
        .eq('id', guest.id);

      if (error) {
        console.error('Error checking in guest:', error);
        toast({
          title: "Check-in Failed",
          description: "Failed to check in guest. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (assignedPager) {
        setUsedPagers(prev => new Set([...prev, assignedPager]));
      }

      toast({
        title: "✅ Guest Checked In",
        description: `${guest.booker_name} has been checked in${assignedPager ? ` with pager #${assignedPager}` : ''}`,
      });

      setSelectedGuest(null);
      setPagerNumber('');
      setNotes('');
    } catch (error) {
      console.error('Unexpected error during check-in:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handlePagerRelease = async (pagerNum: number) => {
    try {
      // Find the guest with this pager and clear it
      const guestWithPager = guests.find(g => g.pager_number === pagerNum);
      if (guestWithPager && guestWithPager.id) {
        const { error } = await supabase
          .from('guests')
          .update({ pager_number: null })
          .eq('id', guestWithPager.id);

        if (error) {
          console.error('Error releasing pager:', error);
          return;
        }
      }

      setUsedPagers(prev => {
        const newSet = new Set(prev);
        newSet.delete(pagerNum);
        return newSet;
      });

      toast({
        title: "📟 Pager Released",
        description: `Pager #${pagerNum} is now available`,
      });
    } catch (error) {
      console.error('Error releasing pager:', error);
    }
  };

  // Handle guest seating with database updates
  const handleGuestSeated = async (guestOriginalIndex: number) => {
    try {
      console.log(`Attempting to seat guest with originalIndex: ${guestOriginalIndex}`);
      
      // Find guest by original_row_index
      const guest = guests.find(g => g.id && g.original_row_index === guestOriginalIndex);
      
      if (!guest) {
        console.error('Guest not found with originalIndex:', guestOriginalIndex);
        toast({
          title: "Error",
          description: "Guest not found",
          variant: "destructive",
        });
        return;
      }

      console.log(`Seating guest: ${guest.booker_name} (ID: ${guest.id})`);

      // Update the database to mark guest as seated
      const { error } = await supabase
        .from('guests')
        .update({
          is_seated: true,
          seated_at: new Date().toISOString()
          // Keep table_assignments - don't clear them
        })
        .eq('id', guest.id);

      if (error) {
        console.error('Error seating guest:', error);
        toast({
          title: "Error",
          description: "Failed to seat guest",
          variant: "destructive",
        });
        return;
      }

      console.log(`Successfully seated guest: ${guest.booker_name}`);

      // Release pager if guest has one
      if (guest.pager_number) {
        await handlePagerRelease(guest.pager_number);
      }

      toast({
        title: "✅ Guest Seated",
        description: `${guest.booker_name} has been seated`,
      });

      // The real-time subscription in GuestManager will handle UI updates
      
    } catch (error) {
      console.error('Unexpected error seating guest:', error);
      toast({
        title: "Error",
        description: "Failed to seat guest",
        variant: "destructive",
      });
    }
  };

  const handleTableAllocated = async (guestOriginalIndex: number, tableIds: number[]) => {
    try {
      console.log(`Allocating tables ${tableIds.join(', ')} to guest with originalIndex: ${guestOriginalIndex}`);
      
      // Find guest by original_row_index
      const guest = guests.find(g => g.id && g.original_row_index === guestOriginalIndex);
      
      if (!guest) {
        console.error('Guest not found with originalIndex:', guestOriginalIndex);
        toast({
          title: "Error",
          description: "Guest not found for table allocation",
          variant: "destructive",
        });
        return;
      }

      console.log(`Allocating tables to guest: ${guest.booker_name} (ID: ${guest.id})`);

      // Update the database with table assignments
      const { error } = await supabase
        .from('guests')
        .update({
          table_assignments: tableIds,
          is_allocated: true
        })
        .eq('id', guest.id);

      if (error) {
        console.error('Error allocating tables:', error);
        toast({
          title: "Error",
          description: "Failed to allocate tables",
          variant: "destructive",
        });
        return;
      }

      console.log(`Successfully allocated tables ${tableIds.join(', ')} to guest: ${guest.booker_name}`);

      // Call the parent callback
      onTableAllocated(guestOriginalIndex, tableIds);

    } catch (error) {
      console.error('Unexpected error allocating tables:', error);
      toast({
        title: "Error",
        description: "Failed to allocate tables",
        variant: "destructive",
      });
    }
  };

  // Filter functions
  const filteredGuests = guests.filter(guest => {
    const matchesSearch = !searchTerm || 
      (guest.booker_name && guest.booker_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      Object.values(guest).some(value => 
        value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesShowTime = showTimeFilter === 'all' || guest.show_time === showTimeFilter;
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'checked-in' && guest.is_checked_in) ||
      (statusFilter === 'not-checked-in' && !guest.is_checked_in) ||
      (statusFilter === 'seated' && guest.is_seated) ||
      (statusFilter === 'allocated' && guest.hasTableAllocated && !guest.is_seated);
    
    return matchesSearch && matchesShowTime && matchesStatus;
  });

  const checkedInGuests = guests.filter(guest => guest.is_checked_in && !guest.is_seated);
  const seatedGuests = guests.filter(guest => guest.is_seated);
  const totalGuests = guests.length;
  const checkedInCount = guests.filter(guest => guest.is_checked_in).length;

  const getNextAvailablePager = () => {
    for (let i = 1; i <= 50; i++) {
      if (!usedPagers.has(i)) {
        return i.toString();
      }
    }
    return '';
  };

  const getShowTimeColor = (showTime: string) => {
    if (showTime === '7pm') return 'bg-orange-100 text-orange-800 border-orange-200';
    if (showTime === '9pm') return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-gray-100 border-gray-200 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-800">{totalGuests}</div>
            <div className="text-sm text-gray-600">Total Guests</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-800">{checkedInCount}</div>
            <div className="text-sm text-gray-600">Checked In</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Radio className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-800">{usedPagers.size}</div>
            <div className="text-sm text-gray-600">Pagers in Use</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <UserCheck className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-800">{seatedGuests.length}</div>
            <div className="text-sm text-gray-600">Seated</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search guests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={showTimeFilter} onValueChange={setShowTimeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Show Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Times</SelectItem>
                  {showTimes.map(time => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="not-checked-in">Not Checked In</SelectItem>
                  <SelectItem value="checked-in">Checked In</SelectItem>
                  <SelectItem value="allocated">Table Allocated</SelectItem>
                  <SelectItem value="seated">Seated</SelectItem>
                </SelectContent>
              </Select>
              {(searchTerm || showTimeFilter !== 'all' || statusFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setShowTimeFilter('all');
                    setStatusFilter('all');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="checkin" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Check-In System
          </TabsTrigger>
          <TabsTrigger value="allocation" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Table Allocation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checkin" className="space-y-6">
          {/* Party Groups Alert */}
          {partyGroups.size > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-800 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Party Groups Detected ({partyGroups.size})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from(partyGroups.entries()).map(([bookerName, groupGuests]) => (
                    <div key={bookerName} className="p-3 bg-blue-100 rounded border border-blue-200">
                      <div className="font-medium text-blue-800">{bookerName}</div>
                      <div className="text-sm text-blue-700">
                        {groupGuests.length} guests • Total: {groupGuests.reduce((sum, g) => sum + (g.total_quantity || 1), 0)} people
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        Consider checking in all guests from this party together
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Guest List */}
          <div className="grid gap-4">
            {filteredGuests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No guests found</h3>
                  <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                </CardContent>
              </Card>
            ) : (
              filteredGuests.map((guest, index) => (
                <Card key={index} className={`transition-all hover:shadow-md ${
                  guest.is_seated ? 'border-green-300 bg-green-50' :
                  guest.is_checked_in ? 'border-blue-300 bg-blue-50' : 
                  'border-gray-200'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{guest.booker_name || 'Unknown'}</h3>
                          {guest.show_time && (
                            <Badge className={getShowTimeColor(guest.show_time)}>
                              {guest.show_time}
                            </Badge>
                          )}
                          {guest.is_seated && (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Seated
                            </Badge>
                          )}
                          {guest.is_checked_in && !guest.is_seated && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Checked In
                            </Badge>
                          )}
                          {guest.hasTableAllocated && !guest.is_seated && (
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                              <MapPin className="h-3 w-3 mr-1" />
                              Table Allocated
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          {headers.slice(0, 4).map(header => (
                            <div key={header}>
                              <span className="font-medium">{header}:</span>
                              <span className="ml-1">{guest[header] || 'N/A'}</span>
                            </div>
                          ))}
                        </div>

                        {guest.pager_number && (
                          <div className="mt-2 flex items-center gap-2">
                            <Radio className="h-4 w-4 text-purple-600" />
                            <span className="text-sm text-purple-600 font-medium">
                              Pager #{guest.pager_number}
                            </span>
                          </div>
                        )}

                        {guest.allocatedTables && guest.allocatedTables.length > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <Utensils className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-blue-600 font-medium">
                              Table{guest.allocatedTables.length > 1 ? 's' : ''}: {guest.allocatedTables.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        {!guest.is_checked_in && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                onClick={() => {
                                  setSelectedGuest(guest);
                                  setPagerNumber(getNextAvailablePager());
                                }}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Check In
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Check In Guest</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h3 className="font-semibold">{selectedGuest?.booker_name}</h3>
                                  <p className="text-sm text-gray-600">
                                    {selectedGuest?.total_quantity || 1} guests • {selectedGuest?.show_time}
                                  </p>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="pager">Pager Number (Optional)</Label>
                                  <Input
                                    id="pager"
                                    type="number"
                                    placeholder="Enter pager number"
                                    value={pagerNumber}
                                    onChange={(e) => setPagerNumber(e.target.value)}
                                  />
                                  <p className="text-xs text-gray-500">
                                    Next available: #{getNextAvailablePager()}
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="notes">Notes (Optional)</Label>
                                  <Textarea
                                    id="notes"
                                    placeholder="Any special notes or requests..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                  />
                                </div>

                                <div className="flex gap-2">
                                  <Button 
                                    onClick={() => selectedGuest && handleCheckIn(selectedGuest)}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                  >
                                    Confirm Check-In
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => {
                                      setSelectedGuest(null);
                                      setPagerNumber('');
                                      setNotes('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        
                        {guest.pager_number && guest.is_checked_in && !guest.is_seated && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePagerRelease(guest.pager_number!)}
                            className="text-purple-600 border-purple-300 hover:bg-purple-50"
                          >
                            Release Pager
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-6">
          <TableAllocation
            onTableAssign={(tableId, guestName, guestCount, showTime) => {
              console.log(`Table ${tableId} assigned to ${guestName}`);
            }}
            checkedInGuests={checkedInGuests.map(guest => ({
              name: guest.booker_name || 'Unknown',
              count: guest.total_quantity || 1,
              showTime: guest.show_time || '',
              originalIndex: guest.original_row_index || 0,
              pagerNumber: guest.pager_number || undefined,
              hasBeenSeated: guest.is_seated || false,
              hasTableAllocated: !!(guest.table_assignments && guest.table_assignments.length > 0),
              allocatedTables: guest.table_assignments || []
            }))}
            onPagerRelease={handlePagerRelease}
            onGuestSeated={handleGuestSeated}
            onTableAllocated={onTableAllocated}
            partyGroups={partyGroups}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CheckInSystem;
