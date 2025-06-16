import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, CheckCircle, User, Clock, Layout, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import TableAllocation from './TableAllocation';

interface Guest {
  [key: string]: string;
}

interface CheckInSystemProps {
  guests: Guest[];
  headers: string[];
}

interface BookingGroup {
  mainBooking: Guest;
  addOns: Guest[];
  originalIndex: number;
  addOnIndices: number[];
}

const CheckInSystem = ({ guests, headers }: CheckInSystemProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState('all');
  const [checkedInGuests, setCheckedInGuests] = useState<Set<number>>(new Set());
  const [tableAssignments, setTableAssignments] = useState<Map<number, number>>(new Map());

  // Debug: Log headers to see what we're working with
  console.log('Available headers:', headers);
  console.log('Sample guest data:', guests[0]);

  // Improved column detection with more flexible matching
  const getColumnIndex = (searchTerms: string[]) => {
    for (const term of searchTerms) {
      const index = headers.findIndex(header => 
        header.toLowerCase().includes(term.toLowerCase())
      );
      if (index !== -1) {
        console.log(`Found column "${headers[index]}" at index ${index} for search term "${term}"`);
        return index;
      }
    }
    console.log(`No column found for search terms: ${searchTerms.join(', ')}`);
    return -1;
  };

  const bookerIndex = getColumnIndex(['booker', 'name', 'customer']);
  const totalQtyIndex = getColumnIndex(['total quantity', 'quantity', 'qty', 'guests', 'pax']);
  const noteIndex = getColumnIndex(['note', 'notes', 'message', 'comment']);
  const itemIndex = getColumnIndex(['item', 'show', 'product']);
  const bookingCodeIndex = getColumnIndex(['booking code', 'code', 'reference', 'booking ref']);

  console.log('Column indices:', {
    booker: bookerIndex,
    totalQty: totalQtyIndex,
    note: noteIndex,
    item: itemIndex,
    bookingCode: bookingCodeIndex
  });

  // Extract show time from Column B (Item field) - looking for [7:00pm] or [9:00pm] patterns
  const extractShowTime = (itemField: string) => {
    if (!itemField) return 'Unknown';
    
    // Look for time patterns in square brackets like [7:00pm] or [9:00pm]
    const timeMatch = itemField.match(/\[(\d{1,2}:\d{2}(?:am|pm))\]/i);
    if (timeMatch) {
      return timeMatch[1];
    }
    
    // Fallback patterns
    if (itemField.includes('7:00pm') || itemField.includes('7pm')) return '7:00pm';
    if (itemField.includes('9:00pm') || itemField.includes('9pm')) return '9:00pm';
    
    return 'Unknown';
  };

  // Check if an item is an add-on (doesn't contain show time info)
  const isAddOn = (itemField: string) => {
    if (!itemField) return false;
    
    // If it contains show time info, it's a main booking
    const timeMatch = itemField.match(/\[(\d{1,2}:\d{2}(?:am|pm))\]/i);
    if (timeMatch) return false;
    
    // If it doesn't contain show time info, it's likely an add-on
    return true;
  };

  // Group bookings by booking code to identify add-ons
  const groupedBookings = useMemo(() => {
    const groups = new Map<string, BookingGroup>();
    
    guests.forEach((guest, index) => {
      const bookingCode = bookingCodeIndex >= 0 ? guest[bookingCodeIndex] || '' : '';
      const itemField = itemIndex >= 0 ? guest[itemIndex] || '' : '';
      
      if (!bookingCode) return;
      
      if (!groups.has(bookingCode)) {
        // First occurrence - this is the main booking
        groups.set(bookingCode, {
          mainBooking: guest,
          addOns: [],
          originalIndex: index,
          addOnIndices: []
        });
      } else {
        // Subsequent occurrence - this is an add-on
        const group = groups.get(bookingCode)!;
        group.addOns.push(guest);
        group.addOnIndices.push(index);
      }
    });
    
    return Array.from(groups.values());
  }, [guests, bookingCodeIndex, itemIndex]);

  // Get ticket types from columns I to AG (indices 8 to 32) - handling duplicates
  const getTicketTypes = (guest: Guest) => {
    const ticketTypes: string[] = [];
    const seenTickets = new Set<string>(); // Track seen ticket types to avoid duplicates
    
    // Check columns I through AG (indices 8-32)
    for (let i = 8; i <= 32 && i < headers.length; i++) {
      const value = guest[i];
      if (value && value.trim() !== '' && value !== '0') {
        const header = headers[i];
        // Only include if it looks like a ticket quantity
        if (!isNaN(parseInt(value))) {
          const ticketDisplay = `${value}x ${header}`;
          // Only add if we haven't seen this exact ticket type before
          if (!seenTickets.has(header)) {
            ticketTypes.push(ticketDisplay);
            seenTickets.add(header);
          } else {
            // If duplicate header, add the quantity to existing one
            const existingIndex = ticketTypes.findIndex(ticket => ticket.includes(header));
            if (existingIndex >= 0) {
              const existingQty = parseInt(ticketTypes[existingIndex].split('x')[0]);
              const newQty = existingQty + parseInt(value);
              ticketTypes[existingIndex] = `${newQty}x ${header}`;
            }
          }
        }
      }
    }
    
    return ticketTypes;
  };

  // Extract guest name from booker field
  const extractGuestName = (bookerField: string) => {
    if (!bookerField) return 'Unknown Guest';
    
    // If it's already a clean name, return it
    if (bookerField.match(/^[A-Za-z\s]+$/)) {
      return bookerField.trim();
    }
    
    // Clean up the booker field to get just the name
    const parts = bookerField.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.match(/^[A-Za-z\s]+$/) && trimmed.length > 1 && !trimmed.includes('@')) {
        return trimmed;
      }
    }
    
    return parts.length > 2 ? parts[2].trim() : parts[0].trim();
  };

  // Get show time from item field (Column B)
  const getShowTime = (guest: Guest) => {
    const itemField = itemIndex >= 0 ? guest[itemIndex] || '' : '';
    return extractShowTime(itemField);
  };

  // Filter bookings based on search and show time
  const filteredBookings = useMemo(() => {
    return groupedBookings.filter((booking) => {
      const bookerField = bookerIndex >= 0 ? booking.mainBooking[bookerIndex] || '' : '';
      const guestName = extractGuestName(bookerField);
      const showTime = getShowTime(booking.mainBooking);
      
      const matchesSearch = searchTerm === '' || 
        guestName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesShow = showFilter === 'all' || showTime === showFilter;
      
      return matchesSearch && matchesShow;
    });
  }, [groupedBookings, searchTerm, showFilter, bookerIndex, itemIndex]);

  const handleCheckIn = (mainIndex: number) => {
    const newCheckedIn = new Set(checkedInGuests);
    const guest = guests[mainIndex];
    const guestName = extractGuestName(bookerIndex >= 0 ? guest[bookerIndex] || '' : '');
    
    if (newCheckedIn.has(mainIndex)) {
      newCheckedIn.delete(mainIndex);
      toast({
        title: "✅ Checked Out",
        description: `${guestName} has been checked out.`,
      });
    } else {
      newCheckedIn.add(mainIndex);
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

  const getShowTimeBadgeStyle = (showTime: string) => {
    if (showTime === '7:00pm' || showTime === '7pm') return 'bg-orange-100 text-orange-800 border-orange-200';
    if (showTime === '9:00pm' || showTime === '9pm') return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Debug info - remove this after fixing */}
      <div className="bg-yellow-50 p-4 rounded border">
        <h4 className="font-semibold text-sm">Debug Info:</h4>
        <p className="text-xs">Headers: {headers.join(', ')}</p>
        <p className="text-xs">Booker Index: {bookerIndex} ({bookerIndex >= 0 ? headers[bookerIndex] : 'Not found'})</p>
        <p className="text-xs">Total Qty Index: {totalQtyIndex} ({totalQtyIndex >= 0 ? headers[totalQtyIndex] : 'Not found'})</p>
        <p className="text-xs">Item Index: {itemIndex} ({itemIndex >= 0 ? headers[itemIndex] : 'Not found'})</p>
        <p className="text-xs">Ticket columns (I-AG): {headers.slice(8, 33).join(', ')}</p>
        <p className="text-xs">Grouped bookings: {groupedBookings.length}</p>
        <p className="text-xs">Duplicate headers found: {headers.filter((header, index) => headers.indexOf(header) !== index).join(', ')}</p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">🎭 Theatre Check-In</h2>
            <p className="text-gray-600 mt-1">Simple guest management with add-ons</p>
          </div>
          <div className="flex items-center space-x-6 text-lg">
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-gray-700">{groupedBookings.length}</span>
              <span className="text-gray-500">Bookings</span>
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
                    variant={showFilter === '7:00pm' ? 'default' : 'outline'}
                    onClick={() => setShowFilter('7:00pm')}
                    className="flex-1"
                  >
                    7pm Show
                  </Button>
                  <Button
                    variant={showFilter === '9:00pm' ? 'default' : 'outline'}
                    onClick={() => setShowFilter('9:00pm')}
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
                  <TableHead className="font-semibold text-gray-700">Booking Code</TableHead>
                  <TableHead className="font-semibold text-gray-700">Booker Name</TableHead>
                  <TableHead className="font-semibold text-gray-700">Total Quantity</TableHead>
                  <TableHead className="font-semibold text-gray-700">Show Time</TableHead>
                  <TableHead className="font-semibold text-gray-700">Ticket Types</TableHead>
                  <TableHead className="font-semibold text-gray-700">Add-Ons</TableHead>
                  <TableHead className="font-semibold text-gray-700">Note</TableHead>
                  <TableHead className="font-semibold text-gray-700">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => {
                  const isCheckedIn = checkedInGuests.has(booking.originalIndex);
                  
                  const bookingCode = bookingCodeIndex >= 0 ? booking.mainBooking[bookingCodeIndex] || '' : '';
                  const booker = extractGuestName(bookerIndex >= 0 ? booking.mainBooking[bookerIndex] || '' : '');
                  const totalQty = totalQtyIndex >= 0 ? booking.mainBooking[totalQtyIndex] || '1' : '1';
                  const showTime = getShowTime(booking.mainBooking);
                  const ticketTypes = getTicketTypes(booking.mainBooking);
                  const note = noteIndex >= 0 ? booking.mainBooking[noteIndex] || '' : '';
                  
                  return (
                    <TableRow key={booking.originalIndex} className={`${isCheckedIn ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'} transition-colors`}>
                      <TableCell>
                        <div className="font-mono text-sm text-gray-700">
                          {bookingCode}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-gray-900">
                          {booker}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <span className="font-bold text-gray-900 text-xl">{totalQty}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getShowTimeBadgeStyle(showTime)}`}>
                          {showTime}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-700 max-w-xs">
                          {ticketTypes.length > 0 ? (
                            <div className="space-y-1">
                              {ticketTypes.map((ticket, idx) => (
                                <div key={idx} className="bg-blue-50 px-2 py-1 rounded text-xs">
                                  {ticket}
                                </div>
                              ))}
                            </div>
                          ) : 'No tickets'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-700 max-w-xs">
                          {booking.addOns.length > 0 ? (
                            <div className="space-y-1">
                              {booking.addOns.map((addOn, idx) => {
                                const addOnItem = itemIndex >= 0 ? addOn[itemIndex] || '' : '';
                                return (
                                  <div key={idx} className="bg-orange-50 px-2 py-1 rounded text-xs flex items-center">
                                    <Plus className="h-3 w-3 mr-1 text-orange-600" />
                                    {addOnItem}
                                  </div>
                                );
                              })}
                            </div>
                          ) : 'No add-ons'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600 max-w-xs">
                          {note}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => handleCheckIn(booking.originalIndex)}
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
            {filteredBookings.length === 0 && (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="text-lg text-gray-500 mb-2">No bookings found</div>
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
                {['7:00pm', '9:00pm'].map(time => {
                  const count = groupedBookings.filter(booking => getShowTime(booking.mainBooking) === time).length;
                  const percentage = groupedBookings.length > 0 ? Math.round((count / groupedBookings.length) * 100) : 0;
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
                  <span className="font-bold text-red-600 text-xl">{groupedBookings.length - checkedInGuests.size}</span>
                </div>
                <div className="text-center pt-4">
                  <div className="text-3xl font-bold text-gray-800">
                    {groupedBookings.length > 0 ? Math.round((checkedInGuests.size / groupedBookings.length) * 100) : 0}%
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
                  {groupedBookings.reduce((total, booking) => {
                    const qty = totalQtyIndex >= 0 ? booking.mainBooking[totalQtyIndex] || '1' : '1';
                    return total + parseInt(qty);
                  }, 0)}
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
