import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  Radio, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search,
  UserCheck,
  UserPlus,
  Calendar,
  Package,
  MessageSquare,
  Hash
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import TableAllocation from './TableAllocation';

interface Guest {
  [key: string]: string | number;
}

interface CheckedInGuest {
  name: string;
  count: number;
  showTime: string;
  originalIndex: number;
  pagerNumber?: number;
  hasBeenSeated?: boolean;
  hasTableAllocated?: boolean;
  allocatedTables?: number[];
}

interface CheckInSystemProps {
  guests: Guest[];
  onGuestsUpdate?: (guests: Guest[]) => void;
}

const CheckInSystem = ({ guests, onGuestsUpdate }: CheckInSystemProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [checkedInGuests, setCheckedInGuests] = useState<Set<number>>(new Set());
  const [pagerAssignments, setPagerAssignments] = useState<Map<number, number>>(new Map());
  const [availablePagers, setAvailablePagers] = useState<Set<number>>(new Set(Array.from({length: 50}, (_, i) => i + 1)));
  const [seatedGuests, setSeatedGuests] = useState<Set<number>>(new Set());
  const [guestTableAllocations, setGuestTableAllocations] = useState<Map<number, number[]>>(new Map());
  const [guestNotes, setGuestNotes] = useState<Map<number, string>>(new Map());
  const [showTimeFilter, setShowTimeFilter] = useState<string>('all');
  const [partyGroups, setPartyGroups] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    // Group guests by booker name to identify party groups
    const groups = new Map();
    guests.forEach((guest, index) => {
      const bookerName = getBookerName(guest);
      if (bookerName && bookerName.trim() !== '') {
        if (!groups.has(bookerName)) {
          groups.set(bookerName, []);
        }
        groups.get(bookerName).push({ ...guest, originalIndex: index });
      }
    });
    
    // Only keep groups with more than one guest
    const actualGroups = new Map();
    groups.forEach((guestList, bookerName) => {
      if (guestList.length > 1) {
        actualGroups.set(bookerName, guestList);
      }
    });
    
    setPartyGroups(actualGroups);
  }, [guests]);

  const getBookerName = (guest: Guest): string => {
    return Object.keys(guest).find(key => 
      key.toLowerCase().includes('booker') && 
      !key.toLowerCase().includes('quantity') &&
      !key.toLowerCase().includes('email') &&
      !key.toLowerCase().includes('phone')
    ) ? String(guest[Object.keys(guest).find(key => 
      key.toLowerCase().includes('booker') && 
      !key.toLowerCase().includes('quantity') &&
      !key.toLowerCase().includes('email') &&
      !key.toLowerCase().includes('phone')
    )!] || '') : '';
  };

  const getShowTime = (guest: Guest): string => {
    const showTimeField = Object.keys(guest).find(key => 
      key.toLowerCase().includes('show') && key.toLowerCase().includes('time')
    );
    return showTimeField ? String(guest[showTimeField] || '') : '';
  };

  const getTotalQuantity = (guest: Guest): number => {
    const quantityField = Object.keys(guest).find(key => 
      key.toLowerCase().includes('total') && key.toLowerCase().includes('quantity')
    );
    return quantityField ? Number(guest[quantityField]) || 1 : 1;
  };

  const getGuestName = (guest: Guest): string => {
    // Try to find booker name first
    const bookerName = getBookerName(guest);
    if (bookerName && bookerName.trim() !== '') {
      return bookerName;
    }
    
    // Fallback to other name fields
    const nameField = Object.keys(guest).find(key => 
      key.toLowerCase().includes('name') && 
      !key.toLowerCase().includes('booker') &&
      !key.toLowerCase().includes('venue')
    );
    return nameField ? String(guest[nameField] || 'Unknown Guest') : 'Unknown Guest';
  };

  const getPackageInfo = (guest: Guest): string => {
    const packageField = Object.keys(guest).find(key => 
      key.toLowerCase().includes('item') && key.toLowerCase().includes('details')
    );
    
    if (packageField) {
      const field = String(guest[packageField] || '').toLowerCase();
      
      if (field.includes('old groupon')) {
        return 'Old Groupon';
      } else if (field.includes('groupon')) {
        return 'Groupon Package';
      } else if (field.includes('dinner') && field.includes('show')) {
        return 'Dinner & Show';
      } else if (field.includes('show') && field.includes('only')) {
        return 'Show Only';
      } else if (field.includes('vip')) {
        return 'VIP Package';
      } else if (field.includes('student')) {
        return 'Student Ticket';
      } else if (field.includes('child')) {
        return 'Child Ticket';
      } else if (field.includes('senior')) {
        return 'Senior Ticket';
      } else if (field.includes('group')) {
        return 'Group Booking';
      } else if (field.includes('comp') || field.includes('complimentary')) {
        return 'Complimentary';
      }
      
      return String(guest[packageField] || 'Standard');
    }
    
    return 'Standard';
  };

  const filteredGuests = guests.filter(guest => {
    const name = getGuestName(guest).toLowerCase();
    const bookerName = getBookerName(guest).toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    const showTime = getShowTime(guest);
    
    const matchesSearch = name.includes(searchLower) || bookerName.includes(searchLower);
    const matchesShowTime = showTimeFilter === 'all' || showTime === showTimeFilter;
    
    return matchesSearch && matchesShowTime;
  });

  const handleCheckIn = (guestIndex: number) => {
    const newCheckedIn = new Set(checkedInGuests);
    newCheckedIn.add(guestIndex);
    setCheckedInGuests(newCheckedIn);

    toast({
      title: "✅ Guest Checked In",
      description: `${getGuestName(guests[guestIndex])} has been checked in`,
    });
  };

  const handleCheckOut = (guestIndex: number) => {
    const newCheckedIn = new Set(checkedInGuests);
    newCheckedIn.delete(guestIndex);
    setCheckedInGuests(newCheckedIn);

    // Remove pager assignment if exists
    const pagerNumber = pagerAssignments.get(guestIndex);
    if (pagerNumber) {
      const newPagerAssignments = new Map(pagerAssignments);
      newPagerAssignments.delete(guestIndex);
      setPagerAssignments(newPagerAssignments);

      const newAvailablePagers = new Set(availablePagers);
      newAvailablePagers.add(pagerNumber);
      setAvailablePagers(newAvailablePagers);
    }

    // Remove from seated if applicable
    const newSeated = new Set(seatedGuests);
    newSeated.delete(guestIndex);
    setSeatedGuests(newSeated);

    // Remove table allocations
    const newAllocations = new Map(guestTableAllocations);
    newAllocations.delete(guestIndex);
    setGuestTableAllocations(newAllocations);

    toast({
      title: "↩️ Guest Checked Out",
      description: `${getGuestName(guests[guestIndex])} has been checked out`,
    });
  };

  const assignPager = (guestIndex: number, pagerNumber: number) => {
    const newPagerAssignments = new Map(pagerAssignments);
    const newAvailablePagers = new Set(availablePagers);

    // Remove from available pagers
    newAvailablePagers.delete(pagerNumber);
    setAvailablePagers(newAvailablePagers);

    // Assign to guest
    newPagerAssignments.set(guestIndex, pagerNumber);
    setPagerAssignments(newPagerAssignments);

    toast({
      title: "📟 Pager Assigned",
      description: `Pager #${pagerNumber} assigned to ${getGuestName(guests[guestIndex])}`,
    });
  };

  const releasePager = (pagerNumber: number) => {
    const newPagerAssignments = new Map(pagerAssignments);
    const newAvailablePagers = new Set(availablePagers);

    // Find and remove guest assignment
    for (const [guestIndex, assignedPager] of newPagerAssignments.entries()) {
      if (assignedPager === pagerNumber) {
        newPagerAssignments.delete(guestIndex);
        break;
      }
    }

    // Add back to available pagers
    newAvailablePagers.add(pagerNumber);
    
    setPagerAssignments(newPagerAssignments);
    setAvailablePagers(newAvailablePagers);

    toast({
      title: "📟 Pager Released",
      description: `Pager #${pagerNumber} is now available`,
    });
  };

  const handleTableAssign = (tableId: number, guestName: string, guestCount: number, showTime: string) => {
    toast({
      title: "🍽️ Table Assigned",
      description: `Table ${tableId} assigned to ${guestName} (${guestCount} guests, ${showTime})`,
    });
  };

  const handleGuestSeated = (guestIndex: number) => {
    const newSeated = new Set(seatedGuests);
    newSeated.add(guestIndex);
    setSeatedGuests(newSeated);

    toast({
      title: "🪑 Guest Seated",
      description: `${getGuestName(guests[guestIndex])} has been seated`,
    });
  };

  const handleTableAllocated = (guestIndex: number, tableIds: number[]) => {
    const newAllocations = new Map(guestTableAllocations);
    newAllocations.set(guestIndex, tableIds);
    setGuestTableAllocations(newAllocations);
  };

  const handleNoteUpdate = (guestIndex: number, note: string) => {
    const newNotes = new Map(guestNotes);
    if (note.trim() === '') {
      newNotes.delete(guestIndex);
    } else {
      newNotes.set(guestIndex, note);
    }
    setGuestNotes(newNotes);
  };

  const getCheckedInGuestsData = (): CheckedInGuest[] => {
    return Array.from(checkedInGuests).map(guestIndex => {
      const guest = guests[guestIndex];
      const allocatedTables = guestTableAllocations.get(guestIndex) || [];
      
      return {
        name: getGuestName(guest),
        count: getTotalQuantity(guest),
        showTime: getShowTime(guest),
        originalIndex: guestIndex,
        pagerNumber: pagerAssignments.get(guestIndex),
        hasBeenSeated: seatedGuests.has(guestIndex),
        hasTableAllocated: allocatedTables.length > 0,
        allocatedTables: allocatedTables
      };
    });
  };

  const uniqueShowTimes = Array.from(new Set(guests.map(getShowTime).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-800">{guests.length}</div>
            <div className="text-sm text-gray-600">Total Guests</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <UserCheck className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-800">{checkedInGuests.size}</div>
            <div className="text-sm text-gray-600">Checked In</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Radio className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-800">{50 - availablePagers.size}</div>
            <div className="text-sm text-gray-600">Pagers Assigned</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-800">{seatedGuests.size}</div>
            <div className="text-sm text-gray-600">Seated</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="checkin" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="checkin" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Guest Check-in
          </TabsTrigger>
          <TabsTrigger value="allocation" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Table Allocation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checkin" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search guests by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="showTimeFilter" className="text-sm font-medium">Show Time:</Label>
              <select
                id="showTimeFilter"
                value={showTimeFilter}
                onChange={(e) => setShowTimeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Shows</option>
                {uniqueShowTimes.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4">
            {filteredGuests.map((guest, index) => {
              const originalIndex = guests.indexOf(guest);
              const isCheckedIn = checkedInGuests.has(originalIndex);
              const pagerNumber = pagerAssignments.get(originalIndex);
              const isSeated = seatedGuests.has(originalIndex);
              const allocatedTables = guestTableAllocations.get(originalIndex) || [];
              const hasNote = guestNotes.has(originalIndex);
              const guestNote = guestNotes.get(originalIndex) || '';
              
              return (
                <Card key={originalIndex} className={`transition-all duration-200 ${
                  isSeated ? 'bg-green-50 border-green-200' : 
                  isCheckedIn ? 'bg-blue-50 border-blue-200' : 
                  'bg-white border-gray-200 hover:border-gray-300'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-semibold text-lg text-gray-800">
                            {getGuestName(guest)}
                          </h3>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {getTotalQuantity(guest)}
                          </Badge>
                          {getShowTime(guest) && (
                            <Badge 
                              className={
                                getShowTime(guest) === '7pm' 
                                  ? 'bg-orange-100 text-orange-800 border-orange-200' 
                                  : getShowTime(guest) === '9pm'
                                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                                  : 'bg-gray-100 border-gray-200 text-gray-800'
                              }
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              {getShowTime(guest)}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-gray-700">Package:</span>
                              <span className="text-sm text-gray-600">{getPackageInfo(guest)}</span>
                            </div>
                            
                            {pagerNumber && (
                              <div className="flex items-center gap-2">
                                <Radio className="h-4 w-4 text-purple-600" />
                                <span className="text-sm font-medium text-gray-700">Pager:</span>
                                <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                                  #{pagerNumber}
                                </Badge>
                              </div>
                            )}

                            {allocatedTables.length > 0 && (
                              <div className="flex items-center gap-2">
                                <Hash className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-gray-700">Tables:</span>
                                <div className="flex gap-1">
                                  {allocatedTables.map(tableId => (
                                    <Badge key={tableId} className="bg-green-100 text-green-800 border-green-200">
                                      T{tableId}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 text-gray-600 mt-0.5" />
                              <div className="flex-1">
                                <Label className="text-sm font-medium text-gray-700">Notes:</Label>
                                <Textarea
                                  placeholder="Add notes for this guest..."
                                  value={guestNote}
                                  onChange={(e) => handleNoteUpdate(originalIndex, e.target.value)}
                                  className="mt-1 text-sm h-16 resize-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {!isCheckedIn ? (
                            <Button
                              onClick={() => handleCheckIn(originalIndex)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Check In
                            </Button>
                          ) : (
                            <>
                              <Button
                                onClick={() => handleCheckOut(originalIndex)}
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50"
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                Check Out
                              </Button>
                              
                              {!pagerNumber && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" className="border-purple-300 text-purple-600 hover:bg-purple-50">
                                      <Radio className="h-4 w-4 mr-2" />
                                      Assign Pager
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Assign Pager to {getGuestName(guest)}</DialogTitle>
                                    </DialogHeader>
                                    <div className="grid grid-cols-5 gap-2 mt-4">
                                      {Array.from(availablePagers).sort((a, b) => a - b).map(pager => (
                                        <Button
                                          key={pager}
                                          variant="outline"
                                          onClick={() => assignPager(originalIndex, pager)}
                                          className="aspect-square"
                                        >
                                          {pager}
                                        </Button>
                                      ))}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {isSeated && (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Seated
                          </Badge>
                        )}
                        {isCheckedIn && !isSeated && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            <Clock className="h-3 w-3 mr-1" />
                            Checked In
                          </Badge>
                        )}
                        {hasNote && (
                          <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-800">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Note
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-6">
          <TableAllocation
            checkedInGuests={getCheckedInGuestsData()}
            onTableAssign={handleTableAssign}
            onPagerRelease={releasePager}
            onGuestSeated={handleGuestSeated}
            onTableAllocated={handleTableAllocated}
            partyGroups={partyGroups}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CheckInSystem;
