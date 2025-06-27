import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Radio, Users, Clock, CheckCircle, MapPin, UserPlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CheckedInGuest {
  name: string;
  count: number;
  showTime: string;
  originalIndex: number;
  pagerNumber?: number;
  hasBeenSeated?: boolean;
  hasTableAllocated?: boolean;
}

interface TableAllocationProps {
  onTableAssign: (tableId: number, guestName: string, guestCount: number, showTime: string) => void;
  checkedInGuests: CheckedInGuest[];
  onPagerRelease: (pagerNumber: number) => void;
  onGuestSeated: (guestIndex: number) => void;
  onTableAllocated: (guestIndex: number, tableIds: number[]) => void;
}

const TableAllocation = ({ 
  onTableAssign, 
  checkedInGuests, 
  onPagerRelease, 
  onGuestSeated,
  onTableAllocated 
}: TableAllocationProps) => {
  const [availableTables, setAvailableTables] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [selectedGuests, setSelectedGuests] = useState<number[]>([]);
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);

  // Walk-in guest state
  const [isWalkInDialogOpen, setIsWalkInDialogOpen] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInCount, setWalkInCount] = useState('');
  const [walkInShowTime, setWalkInShowTime] = useState('');
  const [walkInNotes, setWalkInNotes] = useState('');

  const tableLayout = useMemo(() => {
    const layout = [];
    for (let i = 1; i <= 20; i++) {
      layout.push({
        id: i,
        available: availableTables.includes(i),
      });
    }
    return layout;
  }, [availableTables]);

  const getAvailableTablesCount = () => {
    return availableTables.length;
  };

  const handleTableSelect = (tableId: number) => {
    setSelectedTable(tableId);
    setIsTableDialogOpen(true);
  };

  const handleGuestSelect = (guestIndex: number) => {
    setSelectedGuests(prev => {
      if (prev.includes(guestIndex)) {
        return prev.filter(index => index !== guestIndex);
      } else {
        return [...prev, guestIndex];
      }
    });
  };

  const handleTableAssignment = () => {
    if (!selectedTable) {
      toast({
        title: "⚠️ No Table Selected",
        description: "Please select a table to assign guests to.",
        variant: "destructive"
      });
      return;
    }

    if (selectedGuests.length === 0) {
      toast({
        title: "⚠️ No Guests Selected",
        description: "Please select at least one guest to assign to the table.",
        variant: "destructive"
      });
      return;
    }

    // Assign the selected guests to the selected table
    selectedGuests.forEach(guestIndex => {
      const guest = checkedInGuests.find(guest => guest.originalIndex === guestIndex);
      if (guest) {
        onTableAssign(selectedTable, guest.name, guest.count, guest.showTime);
      }
    });

    // Allocate table to guests
    onTableAllocated(selectedGuests[0], [selectedTable]);

    // Remove the table from available tables
    setAvailableTables(prev => prev.filter(tableId => tableId !== selectedTable));
    
    // Reset state
    setIsTableDialogOpen(false);
    setSelectedGuests([]);
    setSelectedTable(null);
  };

  const handleTableRelease = (tableId: number) => {
    // Release the table and make it available again
    setAvailableTables(prev => [...prev, tableId].sort((a, b) => a - b));
  };

  const handlePagerReleaseInternal = (pagerNumber: number) => {
    onPagerRelease(pagerNumber);
  };

  const handleGuestSeatedInternal = (guestIndex: number) => {
    onGuestSeated(guestIndex);
  };

  const handleWalkInSubmit = () => {
    if (!walkInName.trim() || !walkInCount || !walkInShowTime) {
      toast({
        title: "⚠️ Missing Information",
        description: "Please fill in name, guest count, and show time for walk-in guest.",
        variant: "destructive"
      });
      return;
    }

    const guestCount = parseInt(walkInCount);
    if (isNaN(guestCount) || guestCount < 1) {
      toast({
        title: "⚠️ Invalid Count",
        description: "Guest count must be a valid number greater than 0.",
        variant: "destructive"
      });
      return;
    }

    // Add walk-in guest to checked-in guests list
    const walkInGuest: CheckedInGuest = {
      name: `${walkInName} (Walk-in)`,
      count: guestCount,
      showTime: walkInShowTime,
      originalIndex: -1, // Use -1 to indicate walk-in guest
      hasBeenSeated: false,
      hasTableAllocated: false
    };

    // Add to the local state or pass to parent component
    toast({
      title: "🚶 Walk-in Added",
      description: `${walkInName} (${guestCount} guests) added for ${walkInShowTime} show${walkInNotes ? '. Notes: ' + walkInNotes : ''}`,
    });

    // Reset form
    setWalkInName('');
    setWalkInCount('');
    setWalkInShowTime('');
    setWalkInNotes('');
    setIsWalkInDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">🪑 Table Management</h3>
            <p className="text-gray-600 mt-1">Assign tables and manage seating for checked-in guests</p>
          </div>
          <div className="flex items-center space-x-4">
            <Dialog open={isWalkInDialogOpen} onOpenChange={setIsWalkInDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Walk In
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Walk-in Guest</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="walkin-name">Guest Name *</Label>
                    <Input
                      id="walkin-name"
                      placeholder="Enter guest name"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="walkin-count">Number of Guests *</Label>
                    <Input
                      id="walkin-count"
                      type="number"
                      min="1"
                      placeholder="2"
                      value={walkInCount}
                      onChange={(e) => setWalkInCount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="walkin-showtime">Show Time *</Label>
                    <Select value={walkInShowTime} onValueChange={setWalkInShowTime}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select show time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7:00pm">7:00pm Show</SelectItem>
                        <SelectItem value="8:00pm">8:00pm Show</SelectItem>
                        <SelectItem value="9:00pm">9:00pm Show</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="walkin-notes">Notes (Optional)</Label>
                    <Textarea
                      id="walkin-notes"
                      placeholder="Special requests, allergies, etc."
                      value={walkInNotes}
                      onChange={(e) => setWalkInNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleWalkInSubmit} className="flex-1">
                      Add Walk-in Guest
                    </Button>
                    <Button variant="outline" onClick={() => setIsWalkInDialogOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <div className="text-sm text-gray-600">
              Available Tables: <span className="font-bold text-green-600">{getAvailableTablesCount()}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {tableLayout.map(table => (
            <div
              key={table.id}
              className={`relative aspect-square flex items-center justify-center rounded-lg border-2 text-center font-bold text-gray-700 ${table.available ? 'bg-green-50 border-green-300 hover:bg-green-100 cursor-pointer' : 'bg-red-50 border-red-300 text-red-500 cursor-not-allowed'}`}
              onClick={() => table.available ? handleTableSelect(table.id) : null}
            >
              Table {table.id}
              {!table.available && (
                <div className="absolute inset-0 bg-red-100 opacity-50"></div>
              )}
            </div>
          ))}
        </div>

        <Dialog open={isTableDialogOpen} onOpenChange={setIsTableDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Guests to Table {selectedTable}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-600">Select guests to assign to this table:</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Select</TableHead>
                    <TableHead>Guest Name</TableHead>
                    <TableHead>Show Time</TableHead>
                    <TableHead>Pager</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkedInGuests.map(guest => (
                    <TableRow key={guest.originalIndex}>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`w-24 ${selectedGuests.includes(guest.originalIndex) ? 'bg-blue-500 text-white hover:bg-blue-700' : 'hover:bg-gray-100'}`}
                          onClick={() => handleGuestSelect(guest.originalIndex)}
                        >
                          {selectedGuests.includes(guest.originalIndex) ? 'Selected' : 'Select'}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{guest.name}</div>
                        <div className="text-sm text-gray-500">{guest.count} guests</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">{guest.showTime}</div>
                      </TableCell>
                      <TableCell>
                        {guest.pagerNumber ? (
                          <div className="flex items-center space-x-2">
                            <div className="text-sm text-purple-600 font-bold">#{guest.pagerNumber}</div>
                            <Button variant="ghost" size="sm" onClick={() => handlePagerReleaseInternal(guest.pagerNumber!)}>
                              Release
                            </Button>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">No Pager</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {guest.hasBeenSeated ? (
                          <div className="text-sm text-green-600 font-bold flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Seated
                          </div>
                        ) : guest.hasTableAllocated ? (
                          <div className="text-sm text-blue-600 font-bold flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            Allocated
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => handleGuestSeatedInternal(guest.originalIndex)}>
                            Seat Now
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsTableDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleTableAssignment} disabled={selectedGuests.length === 0}>Assign Table</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default TableAllocation;
