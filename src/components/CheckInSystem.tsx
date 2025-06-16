
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Users, CheckCircle, User, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Guest {
  [key: string]: string;
}

interface CheckInSystemProps {
  guests: Guest[];
  headers: string[];
}

const CheckInSystem = ({ guests, headers }: CheckInSystemProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [checkedInGuests, setCheckedInGuests] = useState<Set<number>>(new Set());

  // Get column indices for essential fields only
  const getColumnIndex = (columnName: string) => {
    const index = headers.findIndex(header => header.toLowerCase().includes(columnName.toLowerCase()));
    return index !== -1 ? index : -1;
  };

  const bookerIndex = getColumnIndex('booker');
  const statusIndex = getColumnIndex('status');
  const firstNameIndex = getColumnIndex('first name');
  const lastNameIndex = getColumnIndex('last name');
  const emailIndex = getColumnIndex('email');
  const bookingCodeIndex = getColumnIndex('booking code');
  const totalQtyIndex = getColumnIndex('total quantity');
  const magicIndex = getColumnIndex('magic');
  const dietIndex = getColumnIndex('diet');
  const friendsIndex = getColumnIndex('friends');
  const startTimeIndex = getColumnIndex('start time');

  // Get unique statuses for filter
  const statuses = useMemo(() => {
    if (statusIndex === -1) return [];
    const uniqueStatuses = [...new Set(guests.map(guest => guest[statusIndex] || '').filter(Boolean))];
    return uniqueStatuses;
  }, [guests, statusIndex]);

  // Get show time (7pm or 9pm)
  const getShowTime = (guest: Guest) => {
    const startTime = guest[startTimeIndex] || '';
    if (startTime.includes('19:') || startTime.includes('7')) return '7pm Show';
    if (startTime.includes('21:') || startTime.includes('9')) return '9pm Show';
    return startTime || 'Unknown';
  };

  // Filter guests based on search and status
  const filteredGuests = useMemo(() => {
    return guests.filter((guest, index) => {
      const booker = guest[bookerIndex] || '';
      const status = guest[statusIndex] || '';
      const firstName = guest[firstNameIndex] || '';
      const lastName = guest[lastNameIndex] || '';
      const email = guest[emailIndex] || '';
      
      const matchesSearch = searchTerm === '' || 
        booker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [guests, headers, searchTerm, statusFilter, bookerIndex, statusIndex, firstNameIndex, lastNameIndex, emailIndex]);

  const handleCheckIn = (guestIndex: number) => {
    const newCheckedIn = new Set(checkedInGuests);
    const guest = guests[guestIndex];
    const guestName = `${guest[firstNameIndex] || ''} ${guest[lastNameIndex] || ''}`.trim() || guest[bookerIndex] || 'Guest';
    
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

  const getStatusBadgeStyle = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'VIATOR':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PAID GYG':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getShowTimeBadgeStyle = (showTime: string) => {
    if (showTime.includes('7pm')) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (showTime.includes('9pm')) return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">🎭 Theatre Check-In</h2>
            <p className="text-gray-600 mt-1">Welcome to your show management system</p>
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
        <TabsList className="grid w-full grid-cols-2 bg-white shadow-sm">
          <TabsTrigger value="checkin" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            Check-In System
          </TabsTrigger>
          <TabsTrigger value="stats" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            Show Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checkin" className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex space-x-4 items-end">
              <div className="flex-1">
                <Label htmlFor="search" className="text-base font-medium text-gray-700">Search Guests</Label>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by name, booker, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 text-base"
                  />
                </div>
              </div>
              <div className="w-60">
                <Label htmlFor="status-filter" className="text-base font-medium text-gray-700">Filter by Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-12 mt-2">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statuses.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold text-gray-700">Show Time</TableHead>
                  <TableHead className="font-semibold text-gray-700">Guest Info</TableHead>
                  <TableHead className="font-semibold text-gray-700">Booking</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700">Special Notes</TableHead>
                  <TableHead className="font-semibold text-gray-700">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuests.map((guest, index) => {
                  const originalIndex = guests.indexOf(guest);
                  const isCheckedIn = checkedInGuests.has(originalIndex);
                  
                  const guestName = `${guest[firstNameIndex] || ''} ${guest[lastNameIndex] || ''}`.trim();
                  const booker = guest[bookerIndex] || '';
                  const email = guest[emailIndex] || '';
                  const status = guest[statusIndex] || 'Unknown';
                  const bookingCode = guest[bookingCodeIndex] || '';
                  const totalQty = guest[totalQtyIndex] || '0';
                  const magic = guest[magicIndex] || '';
                  const diet = guest[dietIndex] || '';
                  const friends = guest[friendsIndex] || '';
                  const showTime = getShowTime(guest);
                  
                  return (
                    <TableRow key={originalIndex} className={`${isCheckedIn ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'} transition-colors`}>
                      <TableCell>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getShowTimeBadgeStyle(showTime)}`}>
                          {showTime}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-semibold text-gray-900">
                            {guestName || booker || 'Guest'}
                          </div>
                          {email && (
                            <div className="text-sm text-gray-600">{email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">
                            {bookingCode || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-600">
                            Qty: {totalQty}
                          </div>
                          {booker && booker !== guestName && (
                            <div className="text-sm text-gray-500">
                              Booker: {booker}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeStyle(status)}`}>
                          {status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {magic && (
                            <div className="text-purple-700 bg-purple-50 px-2 py-1 rounded text-xs">
                              🎩 {magic}
                            </div>
                          )}
                          {diet && (
                            <div className="text-orange-700 bg-orange-50 px-2 py-1 rounded text-xs">
                              🍽️ {diet}
                            </div>
                          )}
                          {friends && (
                            <div className="text-green-700 bg-green-50 px-2 py-1 rounded text-xs">
                              👥 {friends}
                            </div>
                          )}
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

        <TabsContent value="stats" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-600" />
                Show Times
              </h3>
              <div className="space-y-3">
                {['7pm Show', '9pm Show'].map(time => {
                  const count = guests.filter(guest => getShowTime(guest) === time).length;
                  const percentage = guests.length > 0 ? Math.round((count / guests.length) * 100) : 0;
                  return (
                    <div key={time} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="font-medium text-gray-700">{time}</span>
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
                Booking Status
              </h3>
              <div className="space-y-3">
                {statuses.map(status => {
                  const count = guests.filter(guest => guest[statusIndex] === status).length;
                  const percentage = guests.length > 0 ? Math.round((count / guests.length) * 100) : 0;
                  return (
                    <div key={status} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="font-medium text-gray-700">{status}</span>
                      <div className="text-right">
                        <span className="font-bold text-gray-900">{count}</span>
                        <span className="text-sm text-gray-500 ml-2">({percentage}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CheckInSystem;
