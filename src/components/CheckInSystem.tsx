
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, CheckCircle, User, Clock, Layout } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import TableAllocation from './TableAllocation';

interface Guest {
  [key: string]: string;
}

interface CheckInSystemProps {
  guests: Guest[];
  headers: string[];
}

const CheckInSystem = ({ guests, headers }: CheckInSystemProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState('all');
  const [checkedInGuests, setCheckedInGuests] = useState<Set<number>>(new Set());
  const [tableAssignments, setTableAssignments] = useState<Map<number, number>>(new Map());

  // Get column indices for essential fields only
  const getColumnIndex = (columnName: string) => {
    const index = headers.findIndex(header => header.toLowerCase().includes(columnName.toLowerCase()));
    return index !== -1 ? index : -1;
  };

  const bookerIndex = getColumnIndex('booker');
  const totalQtyIndex = getColumnIndex('total quantity');
  const startTimeIndex = getColumnIndex('start time');
  const ticketTypeIndex = getColumnIndex('ticket type');

  // Extract just the name from the booker field
  const extractGuestName = (bookerField: string) => {
    if (!bookerField) return 'Unknown Guest';
    
    // Split by comma and find the part that looks like a name (usually the 3rd part in your format)
    const parts = bookerField.split(',');
    
    // Look for the part that contains a name (letters and spaces, no numbers or special chars)
    for (const part of parts) {
      const trimmed = part.trim();
      // Check if it looks like a name (contains letters, may have spaces, no numbers/special chars except spaces)
      if (trimmed.match(/^[A-Za-z\s]+$/) && trimmed.length > 1 && !trimmed.includes('@')) {
        return trimmed;
      }
    }
    
    // Fallback: return the part after the first comma if it exists
    return parts.length > 2 ? parts[2].trim() : parts[0].trim();
  };

  // Get show time (7pm or 9pm)
  const getShowTime = (guest: Guest) => {
    const startTime = guest[startTimeIndex] || '';
    if (startTime.includes('19:') || startTime.includes('7')) return '7pm';
    if (startTime.includes('21:') || startTime.includes('9')) return '9pm';
    return 'Unknown';
  };

  // Filter guests based on search and show time
  const filteredGuests = useMemo(() => {
    return guests.filter((guest, index) => {
      const bookerField = guest[bookerIndex] || '';
      const guestName = extractGuestName(bookerField);
      const showTime = getShowTime(guest);
      
      const matchesSearch = searchTerm === '' || 
        guestName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesShow = showFilter === 'all' || showTime === showFilter;
      
      return matchesSearch && matchesShow;
    });
  }, [guests, searchTerm, showFilter, bookerIndex, startTimeIndex]);

  const handleCheckIn = (guestIndex: number) => {
    const newCheckedIn = new Set(checkedInGuests);
    const guest = guests[guestIndex];
    const guestName = extractGuestName(guest[bookerIndex] || '');
    
    if (newCheckedIn.has(guestIndex)) {
      newCheckedIn.delete(guestIndex);
      toast({
        title: "✅ Checked Out",
        description: `${guestName} has been checked out.`,
      });
    } else {
      newCheckedIn.add(guestIndex);
      toast({
        title: "🎉 Checked In",
        description: `${guestName} has been checked in successfully!`,
      });
    }
    setCheckedInGuests(newCheckedIn);
  };

  const handleTableAssign = (tableId: number, guestName: string, guestCount: number, showTime: string) => {
    toast({
      title: "🪑 Table Assigned",
      description: `${guestName} (${guestCount} guests) assigned to Table ${tableId}`,
    });
  };

  // Get show time (7pm or 9pm)
  const getShowTimeBadgeStyle = (showTime: string) => {
    if (showTime === '7pm') return 'bg-orange-100 text-orange-800 border-orange-200';
    if (showTime === '9pm') return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">🎭 Theatre Check-In</h2>
            <p className="text-gray-600 mt-1">Simple guest management</p>
          </div>
          <div className="flex items-center space-x-6 text-lg">
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-gray-700">{guests.length}</span>
              <span className="text-gray-500">Total</span>
            </div>
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-gray-700">{checkedInGuests.size}</span>
              <span className="text-gray-500">Checked In</span>
            </div>
          </div>
        </div>
      </div>

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
              <div className="w-60">
                <Label htmlFor="show-filter" className="text-base font-medium text-gray-700">Filter by Show Time</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={showFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setShowFilter('all')}
                    className="flex-1"
                  >
                    All Shows
                  </Button>
                  <Button
                    variant={showFilter === '7pm' ? 'default' : 'outline'}
                    onClick={() => setShowFilter('7pm')}
                    className="flex-1"
                  >
                    7pm Show
                  </Button>
                  <Button
                    variant={showFilter === '9pm' ? 'default' : 'outline'}
                    onClick={() => setShowFilter('9pm')}
                    className="flex-1"
                  >
                    9pm Show
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold text-gray-700">Show Time</TableHead>
                  <TableHead className="font-semibold text-gray-700">Booker Name</TableHead>
                  <TableHead className="font-semibold text-gray-700">TOTAL QUANTITY</TableHead>
                  <TableHead className="font-semibold text-gray-700">Ticket Type</TableHead>
                  <TableHead className="font-semibold text-gray-700">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuests.map((guest, index) => {
                  const originalIndex = guests.indexOf(guest);
                  const isCheckedIn = checkedInGuests.has(originalIndex);
                  
                  const bookerField = guest[bookerIndex] || '';
                  const booker = extractGuestName(bookerField);
                  const totalQty = guest[totalQtyIndex] || '1';
                  const showTime = getShowTime(guest);
                  const ticketType = guest[ticketTypeIndex] || 'Standard Ticket';
                  
                  return (
                    <TableRow key={originalIndex} className={`${isCheckedIn ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'} transition-colors`}>
                      <TableCell>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getShowTimeBadgeStyle(showTime)}`}>
                          {showTime}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-gray-900 text-lg">
                          {booker}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <span className="font-bold text-gray-900 text-xl">{totalQty}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-700 max-w-xs">
                          {ticketType}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => handleCheckIn(originalIndex)}
                          variant={isCheckedIn ? "destructive" : "default"}
                          size="sm"
                          className={isCheckedIn ? "bg-red-500 hover:bg-red-600" : "bg-green-600 hover:bg-green-700"}
                        >
                          {isCheckedIn ? '✓ Check Out' : 'Check In'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filteredGuests.length === 0 && (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="text-lg text-gray-500 mb-2">No guests found</div>
                <div className="text-gray-400">Try adjusting your search or filter criteria</div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tables" className="space-y-6">
          <TableAllocation onTableAssign={handleTableAssign} />
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-600" />
                Show Times
              </h3>
              <div className="space-y-3">
                {['7pm', '9pm'].map(time => {
                  const count = guests.filter(guest => getShowTime(guest) === time).length;
                  const percentage = guests.length > 0 ? Math.round((count / guests.length) * 100) : 0;
                  return (
                    <div key={time} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="font-medium text-gray-700">{time} Show</span>
                      <div className="text-right">
                        <span className="font-bold text-gray-900">{count}</span>
                        <span className="text-sm text-gray-500 ml-2">({percentage}%)</span>
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
                  <span className="font-bold text-green-600 text-xl">{checkedInGuests.size}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                  <span className="font-medium text-gray-700">Waiting</span>
                  <span className="font-bold text-red-600 text-xl">{guests.length - checkedInGuests.size}</span>
                </div>
                <div className="text-center pt-4">
                  <div className="text-3xl font-bold text-gray-800">
                    {guests.length > 0 ? Math.round((checkedInGuests.size / guests.length) * 100) : 0}%
                  </div>
                  <div className="text-gray-600">Completion Rate</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-purple-600" />
                Total Guests
              </h3>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 mb-2">
                  {guests.reduce((total, guest) => total + parseInt(guest[totalQtyIndex] || '1'), 0)}
                </div>
                <div className="text-gray-600">Total Attendees</div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CheckInSystem;
