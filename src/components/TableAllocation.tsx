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
  MapPin, 
  Radio, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Utensils,
  UserCheck,
  Sparkles,
  Plus,
  Minus
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import SmartAllocation from './SmartAllocation';

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

interface TableAllocationProps {
  onTableAssign: (tableId: number, guestName: string, guestCount: number, showTime: string) => void;
  checkedInGuests: CheckedInGuest[];
  onPagerRelease: (pagerNumber: number) => void;
  onGuestSeated: (guestIndex: number) => void;
  onTableAllocated: (guestIndex: number, tableIds: number[]) => void;
  partyGroups?: Map<string, any>;
}

interface Table {
  id: number;
  capacity: number;
  isOccupied: boolean;
  guests?: CheckedInGuest[];
  notes?: string;
  frontSeats?: CheckedInGuest[];
  backSeats?: CheckedInGuest[];
  frontCapacity?: number;
  backCapacity?: number;
  allocatedGuests?: CheckedInGuest[];
}

const TableAllocation = ({ 
  onTableAssign, 
  checkedInGuests, 
  onPagerRelease, 
  onGuestSeated,
  onTableAllocated,
  partyGroups = new Map()
}: TableAllocationProps) => {
  // Updated table layout: 13 tables arranged in rows
  // Front Row: 1,2,3 (2 seats), Second: 4,5,6 (4 seats), Third: 7,8,9 (4 seats), Back: 10,11,12,13 (2 seats)
  const [tables, setTables] = useState<Table[]>([
    // Front Row - 2-seater tables (1-3)
    { id: 1, capacity: 2, isOccupied: false, guests: [], allocatedGuests: [] },
    { id: 2, capacity: 2, isOccupied: false, guests: [], allocatedGuests: [] },
    { id: 3, capacity: 2, isOccupied: false, guests: [], allocatedGuests: [] },
    // Second Row - 4-seater tables (4-6)
    { id: 4, capacity: 4, isOccupied: false, guests: [], frontSeats: [], backSeats: [], frontCapacity: 2, backCapacity: 2, allocatedGuests: [] },
    { id: 5, capacity: 4, isOccupied: false, guests: [], frontSeats: [], backSeats: [], frontCapacity: 2, backCapacity: 2, allocatedGuests: [] },
    { id: 6, capacity: 4, isOccupied: false, guests: [], frontSeats: [], backSeats: [], frontCapacity: 2, backCapacity: 2, allocatedGuests: [] },
    // Third Row - 4-seater tables (7-9)
    { id: 7, capacity: 4, isOccupied: false, guests: [], frontSeats: [], backSeats: [], frontCapacity: 2, backCapacity: 2, allocatedGuests: [] },
    { id: 8, capacity: 4, isOccupied: false, guests: [], frontSeats: [], backSeats: [], frontCapacity: 2, backCapacity: 2, allocatedGuests: [] },
    { id: 9, capacity: 4, isOccupied: false, guests: [], frontSeats: [], backSeats: [], frontCapacity: 2, backCapacity: 2, allocatedGuests: [] },
    // Back Row - 2-seater tables (10-13)
    { id: 10, capacity: 2, isOccupied: false, guests: [], allocatedGuests: [] },
    { id: 11, capacity: 2, isOccupied: false, guests: [], allocatedGuests: [] },
    { id: 12, capacity: 2, isOccupied: false, guests: [], allocatedGuests: [] },
    { id: 13, capacity: 2, isOccupied: false, guests: [], allocatedGuests: [] }
  ]);

  const [selectedGuest, setSelectedGuest] = useState<CheckedInGuest | null>(null);
  const [selectedTables, setSelectedTables] = useState<number[]>([]);
  const [tableNotes, setTableNotes] = useState<Map<number, string>>(new Map());
  const [seatPosition, setSeatPosition] = useState<'front' | 'back' | 'any'>('any');

  // Helper function to update table occupancy for both manual and smart allocation
  const allocateGuestToTables = (guest: CheckedInGuest, tableIds: number[], position: 'front' | 'back' | 'any' = 'any') => {
    setTables(prev => prev.map(table => {
      if (tableIds.includes(table.id)) {
        const updatedTable = {
          ...table,
          allocatedGuests: [...(table.allocatedGuests || []), guest]
        };

        // Handle front/back seating for 4-seater tables
        if (table.capacity === 4 && position !== 'any') {
          if (position === 'front') {
            updatedTable.frontSeats = [...(table.frontSeats || []), guest];
          } else {
            updatedTable.backSeats = [...(table.backSeats || []), guest];
          }
        }

        return updatedTable;
      }
      return table;
    }));

    // Call the callback to update parent state
    onTableAllocated(guest.originalIndex, tableIds);
    
    // Notify about assignment
    onTableAssign(tableIds[0], guest.name, guest.count, guest.showTime);

    toast({
      title: "✅ Table Allocated",
      description: `${guest.name} assigned to table${tableIds.length > 1 ? 's' : ''} ${tableIds.join(', ')}`,
    });
  };

  // Handle smart allocation callback
  const handleSmartAllocation = (guestIndex: number, tableIds: number[]) => {
    const guest = checkedInGuests.find(g => g.originalIndex === guestIndex);
    if (guest) {
      allocateGuestToTables(guest, tableIds);
    }
  };

  const handleTableSelect = (tableId: number) => {
    setSelectedTables(prev => {
      const isSelected = prev.includes(tableId);
      if (isSelected) {
        return prev.filter(id => id !== tableId);
      } else {
        return [...prev, tableId];
      }
    });
  };

  const handleManualAssignment = () => {
    if (!selectedGuest || selectedTables.length === 0) return;

    allocateGuestToTables(selectedGuest, selectedTables, seatPosition);

    // Reset selection
    setSelectedGuest(null);
    setSelectedTables([]);
    setSeatPosition('any');
  };

  const handleSeatGuest = (guest: CheckedInGuest) => {
    // Move guest from allocated to seated in tables
    const guestTables = guest.allocatedTables || [];
    
    setTables(prev => prev.map(table => {
      if (guestTables.includes(table.id)) {
        return {
          ...table,
          isOccupied: true,
          guests: [...(table.guests || []), guest],
          allocatedGuests: (table.allocatedGuests || []).filter(g => g.originalIndex !== guest.originalIndex)
        };
      }
      return table;
    }));

    onGuestSeated(guest.originalIndex);
    
    if (guest.pagerNumber) {
      onPagerRelease(guest.pagerNumber);
    }
  };

  const clearTable = (tableId: number) => {
    setTables(prev => prev.map(table => {
      if (table.id === tableId) {
        return {
          ...table,
          isOccupied: false,
          guests: [],
          frontSeats: [],
          backSeats: [],
          allocatedGuests: []
        };
      }
      return table;
    }));

    const noteMap = new Map(tableNotes);
    noteMap.delete(tableId);
    setTableNotes(noteMap);

    toast({
      title: "🧹 Table Cleared",
      description: `Table ${tableId} is now available`,
    });
  };

  const handleTableNote = (tableId: number, note: string) => {
    const noteMap = new Map(tableNotes);
    if (note.trim() === '') {
      noteMap.delete(tableId);
    } else {
      noteMap.set(tableId, note);
    }
    setTableNotes(noteMap);
  };

  const getTableStatusColor = (table: Table) => {
    if (table.isOccupied) return 'bg-red-100 border-red-300 text-red-800';
    if (table.allocatedGuests && table.allocatedGuests.length > 0) return 'bg-orange-100 border-orange-300 text-orange-800';
    if (selectedTables.includes(table.id)) return 'bg-blue-100 border-blue-300 text-blue-800';
    return 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200';
  };

  const getShowTimeColor = (showTime: string) => {
    if (showTime === '7pm') return 'bg-orange-100 text-orange-800 border-orange-200';
    if (showTime === '9pm') return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-gray-100 border-gray-200 text-gray-800';
  };

  const is4SeaterTable = (tableId: number) => {
    return tableId >= 4 && tableId <= 9;
  };

  const waitingGuests = checkedInGuests.filter(guest => !guest.hasBeenSeated);
  const allocatedGuests = checkedInGuests.filter(guest => guest.hasTableAllocated && !guest.hasBeenSeated);
  const seatedGuests = checkedInGuests.filter(guest => guest.hasBeenSeated);

  const adjustSeatCapacity = (tableId: number, position: 'front' | 'back', change: number) => {
    setTables(prev => prev.map(table => {
      if (table.id === tableId) {
        const updatedTable = { ...table };
        
        if (position === 'front' && updatedTable.frontCapacity !== undefined) {
          const newCapacity = Math.max(0, updatedTable.frontCapacity + change);
          updatedTable.frontCapacity = newCapacity;
          updatedTable.capacity = newCapacity + (updatedTable.backCapacity || 0);
        } else if (position === 'back' && updatedTable.backCapacity !== undefined) {
          const newCapacity = Math.max(0, updatedTable.backCapacity + change);
          updatedTable.backCapacity = newCapacity;
          updatedTable.capacity = (updatedTable.frontCapacity || 0) + newCapacity;
        }
        
        return updatedTable;
      }
      return table;
    }));
  };

  const adjustTableCapacity = (tableId: number, change: number) => {
    setTables(prev => prev.map(table => {
      if (table.id === tableId && (table.frontCapacity === undefined && table.backCapacity === undefined)) {
        return {
          ...table,
          capacity: Math.max(1, table.capacity + change)
        };
      }
      return table;
    }));
  };

  // Convert tables to format expected by SmartAllocation
  const smartAllocationTables = tables.map(table => ({
    id: table.id,
    capacity: table.capacity,
    isOccupied: table.isOccupied || (table.allocatedGuests && table.allocatedGuests.length > 0),
    currentGuests: (table.guests?.reduce((sum, guest) => sum + guest.count, 0) || 0) + 
                   (table.allocatedGuests?.reduce((sum, guest) => sum + guest.count, 0) || 0)
  }));

  const renderTableCard = (table: Table, rowName: string) => {
    const has4Seats = table.frontCapacity !== undefined && table.backCapacity !== undefined;
    const hasAllocatedGuests = table.allocatedGuests && table.allocatedGuests.length > 0;
    const hasSeatedGuests = table.guests && table.guests.length > 0;
    
    return (
      <Card key={table.id} className={`${hasSeatedGuests ? 'border-red-300 bg-red-50' : hasAllocatedGuests ? 'border-orange-300 bg-orange-50' : 'border-green-300 bg-green-50'}`}>
        <CardContent className="p-4 text-center space-y-3">
          <div className="font-bold text-lg">T{table.id}</div>
          
          {has4Seats ? (
            // 4-seater table with front/back controls
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Total: {table.capacity} seats</div>
              
              {/* Front seats control */}
              <div className="flex items-center justify-between bg-blue-50 p-2 rounded">
                <span className="text-xs font-medium">Front:</span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adjustSeatCapacity(table.id, 'front', -1)}
                    disabled={table.frontCapacity === 0}
                    className="h-6 w-6 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-xs w-6 text-center">{table.frontCapacity}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adjustSeatCapacity(table.id, 'front', 1)}
                    className="h-6 w-6 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {/* Back seats control */}
              <div className="flex items-center justify-between bg-purple-50 p-2 rounded">
                <span className="text-xs font-medium">Back:</span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adjustSeatCapacity(table.id, 'back', -1)}
                    disabled={table.backCapacity === 0}
                    className="h-6 w-6 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-xs w-6 text-center">{table.backCapacity}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adjustSeatCapacity(table.id, 'back', 1)}
                    className="h-6 w-6 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // 2-seater table with simple capacity control
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => adjustTableCapacity(table.id, -1)}
                  disabled={table.capacity === 1}
                  className="h-6 w-6 p-0"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-sm">{table.capacity} seats</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => adjustTableCapacity(table.id, 1)}
                  className="h-6 w-6 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Show allocated guests */}
          {hasAllocatedGuests && (
            <div className="mt-2 space-y-1 bg-orange-100 p-2 rounded border border-orange-200">
              <div className="text-xs font-medium text-orange-800">
                Allocated ({table.allocatedGuests!.reduce((sum, guest) => sum + guest.count, 0)} guests)
              </div>
              {table.allocatedGuests!.map((guest, idx) => (
                <div key={idx} className="text-xs text-orange-700">
                  {guest.name}
                  {guest.pagerNumber && ` (Pager #${guest.pagerNumber})`}
                </div>
              ))}
            </div>
          )}
          
          {/* Show seated guests */}
          {hasSeatedGuests && (
            <div className="mt-2 space-y-1">
              <div className="text-xs font-medium text-red-800">
                Seated ({table.guests!.reduce((sum, guest) => sum + guest.count, 0)} guests)
              </div>
              {has4Seats && (
                <>
                  {table.frontSeats && table.frontSeats.length > 0 && (
                    <div className="text-xs text-red-700">
                      Front: {table.frontSeats.map(g => `${g.name}${g.pagerNumber ? ` (Pager #${g.pagerNumber})` : ''}`).join(', ')}
                    </div>
                  )}
                  {table.backSeats && table.backSeats.length > 0 && (
                    <div className="text-xs text-red-700">
                      Back: {table.backSeats.map(g => `${g.name}${g.pagerNumber ? ` (Pager #${g.pagerNumber})` : ''}`).join(', ')}
                    </div>
                  )}
                </>
              )}
              {!has4Seats && table.guests!.map((guest, idx) => (
                <div key={idx} className="text-xs text-red-700">
                  {guest.name}
                  {guest.pagerNumber && ` (Pager #${guest.pagerNumber})`}
                </div>
              ))}
            </div>
          )}
          
          {(hasSeatedGuests || hasAllocatedGuests) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearTable(table.id)}
              className="mt-2 text-red-600 border-red-300 hover:bg-red-50"
            >
              Clear
            </Button>
          )}
          
          <div className="mt-2">
            <Textarea
              placeholder="Table notes..."
              value={tableNotes.get(table.id) || ''}
              onChange={(e) => handleTableNote(table.id, e.target.value)}
              className="text-xs h-16 resize-none"
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-800">{waitingGuests.length}</div>
            <div className="text-sm text-gray-600">Waiting for Tables</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MapPin className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-800">{allocatedGuests.length}</div>
            <div className="text-sm text-gray-600">Tables Allocated</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-800">{seatedGuests.length}</div>
            <div className="text-sm text-gray-600">Currently Seated</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Utensils className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-800">{tables.filter(t => t.isOccupied).length}</div>
            <div className="text-sm text-gray-600">Tables Occupied</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="smart" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="smart" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Smart Allocation
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Manual Assignment
          </TabsTrigger>
          <TabsTrigger value="layout" className="flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            Table Layout
          </TabsTrigger>
          <TabsTrigger value="seated" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Currently Seated
          </TabsTrigger>
        </TabsList>

        <TabsContent value="smart" className="space-y-6">
          <SmartAllocation
            checkedInGuests={waitingGuests}
            partyGroups={partyGroups}
            onTableAllocated={handleSmartAllocation}
            tables={smartAllocationTables}
          />
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Guests Waiting for Tables</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {waitingGuests.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No guests waiting for table assignment</p>
                ) : (
                  waitingGuests.map((guest, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedGuest?.originalIndex === guest.originalIndex
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                      onClick={() => setSelectedGuest(guest)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-800">{guest.name}</h3>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-gray-600" />
                              <span className="text-sm text-gray-600">{guest.count} guests</span>
                            </div>
                            {guest.pagerNumber && (
                              <div className="flex items-center gap-1">
                                <Radio className="h-4 w-4 text-purple-600" />
                                <span className="text-sm text-purple-600">#{guest.pagerNumber}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge className={getShowTimeColor(guest.showTime)}>
                          {guest.showTime}
                        </Badge>
                      </div>
                      {guest.hasTableAllocated && (
                        <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                          <div className="text-sm text-blue-800 font-medium">
                            Allocated to Table{guest.allocatedTables && guest.allocatedTables.length > 1 ? 's' : ''}: {guest.allocatedTables?.join(', ') || 'N/A'}
                          </div>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSeatGuest(guest);
                            }}
                            size="sm"
                            className="mt-2 bg-green-600 hover:bg-green-700"
                          >
                            Mark as Seated
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Select Tables ({selectedTables.length} selected)</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Seat Position Selection for 4-seater tables */}
                {selectedTables.some(id => is4SeaterTable(id)) && (
                  <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                    <Label className="text-sm font-medium text-blue-800 mb-2 block">
                      Seat Position (for 4-seater tables):
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        variant={seatPosition === 'front' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSeatPosition('front')}
                      >
                        Front Seats
                      </Button>
                      <Button
                        variant={seatPosition === 'back' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSeatPosition('back')}
                      >
                        Back Seats
                      </Button>
                      <Button
                        variant={seatPosition === 'any' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSeatPosition('any')}
                      >
                        Any Position
                      </Button>
                    </div>
                  </div>
                )}

                {/* Table Layout Grid */}
                <div className="space-y-4 mb-4">
                  {/* Front Row */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Front Row</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {tables.slice(0, 3).map((table) => (
                        <Button
                          key={table.id}
                          variant="outline"
                          className={`h-20 flex flex-col items-center justify-center ${getTableStatusColor(table)}`}
                          onClick={() => !table.isOccupied && handleTableSelect(table.id)}
                          disabled={table.isOccupied}
                        >
                          <div className="font-semibold">T{table.id}</div>
                          <div className="text-xs">{table.capacity} seats</div>
                          {table.isOccupied && (
                            <div className="text-xs mt-1">
                              {table.guests?.reduce((sum, guest) => sum + guest.count, 0)} guests
                            </div>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Second Row */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Second Row</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {tables.slice(3, 6).map((table) => (
                        <Button
                          key={table.id}
                          variant="outline"
                          className={`h-20 flex flex-col items-center justify-center ${getTableStatusColor(table)}`}
                          onClick={() => !table.isOccupied && handleTableSelect(table.id)}
                          disabled={table.isOccupied}
                        >
                          <div className="font-semibold">T{table.id}</div>
                          <div className="text-xs">{table.capacity} seats</div>
                          {table.isOccupied && (
                            <div className="text-xs mt-1">
                              {table.guests?.reduce((sum, guest) => sum + guest.count, 0)} guests
                            </div>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Third Row */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Third Row</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {tables.slice(6, 9).map((table) => (
                        <Button
                          key={table.id}
                          variant="outline"
                          className={`h-20 flex flex-col items-center justify-center ${getTableStatusColor(table)}`}
                          onClick={() => !table.isOccupied && handleTableSelect(table.id)}
                          disabled={table.isOccupied}
                        >
                          <div className="font-semibold">T{table.id}</div>
                          <div className="text-xs">{table.capacity} seats</div>
                          {table.isOccupied && (
                            <div className="text-xs mt-1">
                              {table.guests?.reduce((sum, guest) => sum + guest.count, 0)} guests
                            </div>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Back Row */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Back Row</h4>
                    <div className="grid grid-cols-4 gap-3">
                      {tables.slice(9, 13).map((table) => (
                        <Button
                          key={table.id}
                          variant="outline"
                          className={`h-20 flex flex-col items-center justify-center ${getTableStatusColor(table)}`}
                          onClick={() => !table.isOccupied && handleTableSelect(table.id)}
                          disabled={table.isOccupied}
                        >
                          <div className="font-semibold">T{table.id}</div>
                          <div className="text-xs">{table.capacity} seats</div>
                          {table.isOccupied && (
                            <div className="text-xs mt-1">
                              {table.guests?.reduce((sum, guest) => sum + guest.count, 0)} guests
                            </div>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedGuest && selectedTables.length > 0 && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded border border-blue-200">
                      <div className="font-medium text-blue-800 mb-2">Assignment Summary:</div>
                      <div className="text-sm text-blue-700">
                        <div><strong>{selectedGuest.name}</strong> ({selectedGuest.count} guests)</div>
                        <div>Tables: {selectedTables.join(', ')}</div>
                        <div>Total Capacity: {selectedTables.reduce((sum, tableId) => {
                          const table = tables.find(t => t.id === tableId);
                          return sum + (table?.capacity || 0);
                        }, 0)} seats</div>
                        {seatPosition !== 'any' && selectedTables.some(id => is4SeaterTable(id)) && (
                          <div>Position: {seatPosition} seats</div>
                        )}
                      </div>
                    </div>
                    <Button 
                      onClick={handleManualAssignment}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Allocate Tables
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="layout" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theatre Layout - Seat Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Front Row */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Front Row</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {tables.slice(0, 3).map((table) => renderTableCard(table, 'Front'))}
                  </div>
                </div>

                {/* Second Row */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Second Row</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {tables.slice(3, 6).map((table) => renderTableCard(table, 'Second'))}
                  </div>
                </div>

                {/* Third Row */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Third Row</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {tables.slice(6, 9).map((table) => renderTableCard(table, 'Third'))}
                  </div>
                </div>

                {/* Back Row */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Back Row</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {tables.slice(9, 13).map((table) => renderTableCard(table, 'Back'))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seated" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Currently Seated Guests</CardTitle>
            </CardHeader>
            <CardContent>
              {seatedGuests.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No guests have been seated yet</p>
              ) : (
                <div className="space-y-3">
                  {seatedGuests.map((guest, index) => (
                    <div key={index} className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold text-green-800">{guest.name}</h3>
                          <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-green-600">{guest.count} guests</span>
                            </div>
                            <Badge className={getShowTimeColor(guest.showTime)}>
                              {guest.showTime}
                            </Badge>
                          </div>
                        </div>
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TableAllocation;
