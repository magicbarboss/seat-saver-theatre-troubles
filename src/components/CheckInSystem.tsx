
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Users, Clock, CheckCircle } from 'lucide-react';
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

  // Get unique statuses for filter
  const statuses = useMemo(() => {
    const statusIndex = headers.indexOf('Status');
    if (statusIndex === -1) return [];
    const uniqueStatuses = [...new Set(guests.map(guest => guest[statusIndex] || '').filter(Boolean))];
    return uniqueStatuses;
  }, [guests, headers]);

  // Filter guests based on search and status
  const filteredGuests = useMemo(() => {
    return guests.filter((guest, index) => {
      const bookerIndex = headers.indexOf('Booker');
      const statusIndex = headers.indexOf('Status');
      const firstNameIndex = headers.indexOf('First Name');
      const lastNameIndex = headers.indexOf('Last Name');
      
      const booker = guest[bookerIndex] || '';
      const status = guest[statusIndex] || '';
      const firstName = guest[firstNameIndex] || '';
      const lastName = guest[lastNameIndex] || '';
      
      const matchesSearch = searchTerm === '' || 
        booker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lastName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [guests, headers, searchTerm, statusFilter]);

  const handleCheckIn = (guestIndex: number) => {
    const newCheckedIn = new Set(checkedInGuests);
    if (newCheckedIn.has(guestIndex)) {
      newCheckedIn.delete(guestIndex);
      toast({
        title: "Guest Checked Out",
        description: "Guest has been checked out successfully.",
      });
    } else {
      newCheckedIn.add(guestIndex);
      toast({
        title: "Guest Checked In",
        description: "Guest has been checked in successfully.",
      });
    }
    setCheckedInGuests(newCheckedIn);
  };

  const getGuestTicketTypes = (guest: Guest) => {
    const ticketTypes = [];
    // Check all the ticket type columns for quantities > 0
    const ticketColumns = [
      'Adult Show Ticket includes 2 Drinks',
      'Comedy ticket plus 9" Pizza',
      'Adult Comedy & Magic Show Ticket + 9" Pizza',
      'Adult Show Ticket includes 2 Drinks + 9" Pizza',
      'Adult Comedy Magic Show ticket',
      'Groupon Magic & Pints Package (per person)',
      'Groupon Magic & Cocktails Package (per person)',
      'Wowcher Magic & Cocktails Package (per person)'
    ];
    
    ticketColumns.forEach(column => {
      const index = headers.indexOf(column);
      if (index !== -1 && guest[index] && parseInt(guest[index]) > 0) {
        ticketTypes.push(`${column}: ${guest[index]}`);
      }
    });
    
    return ticketTypes;
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Theatre Check-In System</h2>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4" />
            <span>Total: {guests.length}</span>
          </div>
          <div className="flex items-center space-x-1">
            <CheckCircle className="h-4 w-4" />
            <span>Checked In: {checkedInGuests.size}</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="checkin" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="checkin">Check-In</TabsTrigger>
          <TabsTrigger value="guests">Guest List</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="checkin" className="space-y-4">
          <div className="flex space-x-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">Search Guests</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by booker name, first name, or last name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Label htmlFor="status-filter">Filter by Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
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

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Booker</TableHead>
                  <TableHead>Guest Name</TableHead>
                  <TableHead>Booking Code</TableHead>
                  <TableHead>Tickets</TableHead>
                  <TableHead>Total Qty</TableHead>
                  <TableHead>Magic</TableHead>
                  <TableHead>Diet</TableHead>
                  <TableHead>Friends</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuests.map((guest, index) => {
                  const originalIndex = guests.indexOf(guest);
                  const isCheckedIn = checkedInGuests.has(originalIndex);
                  const bookerIndex = headers.indexOf('Booker');
                  const bookingCodeIndex = headers.indexOf('Booking Code');
                  const statusIndex = headers.indexOf('Status');
                  const totalQtyIndex = headers.indexOf('Total Quantity');
                  const firstNameIndex = headers.indexOf('First Name');
                  const lastNameIndex = headers.indexOf('Last Name');
                  const magicIndex = headers.indexOf('Magic');
                  const dietIndex = headers.indexOf('DIET');
                  const friendsIndex = headers.indexOf('Friends');
                  
                  const guestName = `${guest[firstNameIndex] || ''} ${guest[lastNameIndex] || ''}`.trim();
                  const ticketTypes = getGuestTicketTypes(guest);
                  
                  return (
                    <TableRow key={originalIndex} className={isCheckedIn ? 'bg-green-50' : ''}>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          guest[statusIndex] === 'PAID' ? 'bg-green-100 text-green-800' :
                          guest[statusIndex] === 'VIATOR' ? 'bg-blue-100 text-blue-800' :
                          guest[statusIndex] === 'PAID GYG' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {guest[statusIndex] || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{guest[bookerIndex] || 'N/A'}</TableCell>
                      <TableCell>{guestName || 'N/A'}</TableCell>
                      <TableCell>{guest[bookingCodeIndex] || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {ticketTypes.slice(0, 2).map((ticket, i) => (
                            <div key={i} className="text-xs text-muted-foreground">{ticket}</div>
                          ))}
                          {ticketTypes.length > 2 && (
                            <div className="text-xs text-muted-foreground">+{ticketTypes.length - 2} more</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{guest[totalQtyIndex] || '0'}</TableCell>
                      <TableCell>{guest[magicIndex] || 'N/A'}</TableCell>
                      <TableCell>{guest[dietIndex] || 'N/A'}</TableCell>
                      <TableCell>{guest[friendsIndex] || 'N/A'}</TableCell>
                      <TableCell>
                        <Button
                          onClick={() => handleCheckIn(originalIndex)}
                          variant={isCheckedIn ? "destructive" : "default"}
                          size="sm"
                        >
                          {isCheckedIn ? 'Check Out' : 'Check In'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filteredGuests.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No guests found matching your search criteria.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="guests" className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            Complete guest list with all booking details
          </div>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.slice(0, 10).map((header, index) => (
                    <TableHead key={index}>{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {guests.slice(0, 20).map((guest, index) => (
                  <TableRow key={index}>
                    {headers.slice(0, 10).map((header, headerIndex) => (
                      <TableCell key={headerIndex}>{guest[headerIndex] || 'N/A'}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {guests.length > 20 && (
              <p className="text-sm text-muted-foreground p-4 border-t">
                Showing first 20 rows of {guests.length} total guests. Use the Check-In tab for better filtering.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-md p-4">
              <h3 className="font-semibold mb-2">Booking Status</h3>
              <div className="space-y-2">
                {statuses.map(status => {
                  const count = guests.filter(guest => guest[headers.indexOf('Status')] === status).length;
                  return (
                    <div key={status} className="flex justify-between">
                      <span>{status}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="border rounded-md p-4">
              <h3 className="font-semibold mb-2">Check-In Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Checked In</span>
                  <span className="font-medium text-green-600">{checkedInGuests.size}</span>
                </div>
                <div className="flex justify-between">
                  <span>Not Checked In</span>
                  <span className="font-medium text-red-600">{guests.length - checkedInGuests.size}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Guests</span>
                  <span className="font-medium">{guests.length}</span>
                </div>
              </div>
            </div>
            <div className="border rounded-md p-4">
              <h3 className="font-semibold mb-2">Total Quantity</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Tickets</span>
                  <span className="font-medium">
                    {guests.reduce((sum, guest) => {
                      const qty = parseInt(guest[headers.indexOf('Total Quantity')] || '0');
                      return sum + qty;
                    }, 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CheckInSystem;
