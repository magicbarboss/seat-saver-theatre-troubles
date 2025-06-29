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
  Sparkles
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
}

const TableAllocation = ({ 
  onTableAssign, 
  checkedInGuests, 
  onPagerRelease, 
  onGuestSeated,
  onTableAllocated,
  partyGroups = new Map()
}: TableAllocationProps) => {
  // Updated table layout to match restaurant: Tables 1-3 (2 seats), 4-9 (4 seats), 10-14 (2 seats)
  const [tables, setTables] = useState<Table[]>([
    // 2-seater tables (1-3)
    { id: 1, capacity: 2, isOccupied: false, guests: [] },
    { id: 2, capacity: 2, isOccupied: false, guests: [] },
    { id: 3, capacity: 2, isOccupied: false, guests: [] },
    // 4-seater tables (4-9)
    { id: 4, capacity: 4, isOccupied: false, guests: [] },
    { id: 5, capacity: 4, isOccupied: false, guests: [] },
    { id: 6, capacity: 4, isOccupied: false, guests: [] },
    { id: 7, capacity: 4, isOccupied: false, guests: [] },
    { id: 8, capacity: 4, isOccupied: false, guests: [] },
    { id: 9, capacity: 4, isOccupied: false, guests: [] },
    // 2-seater tables (10-14)
    { id: 10, capacity: 2, isOccupied: false, guests: [] },
    { id: 11, capacity: 2, isOccupied: false, guests: [] },
    { id: 12, capacity: 2, isOccupied: false, guests: [] },
    { id: 13, capacity: 2, isOccupied: false, guests: [] },
    { id: 14, capacity: 2, isOccupied: false, guests: [] }
  ]);

  const [selectedGuest, setSelectedGuest] = useState<CheckedInGuest | null>(null);
  const [selectedTables, setSelectedTables] = useState<number[]>([]);
  const [tableNotes, setTableNotes] = useState<Map<number, string>>(new Map());

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

  const handleAssignment = () => {
    if (!selectedGuest || selectedTables.length === 0) return;

    // Mark tables as occupied
    setTables(prev => prev.map(table => {
      if (selectedTables.includes(table.id)) {
        return {
          ...table,
          isOccupied: true,
          guests: [...(table.guests || []), selectedGuest]
        };
      }
      return table;
    }));

    // Call the callback to update parent state
    onTableAllocated(selectedGuest.originalIndex, selectedTables);
    
    // Notify about assignment
    onTableAssign(selectedTables[0], selectedGuest.name, selectedGuest.count, selectedGuest.showTime);

    // Reset selection
    setSelectedGuest(null);
    setSelectedTables([]);
  };

  const handleSeatGuest = (guest: CheckedInGuest) => {
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
          guests: []
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
    if (selectedTables.includes(table.id)) return 'bg-blue-100 border-blue-300 text-blue-800';
    return 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200';
  };

  const getShowTimeColor = (showTime: string) => {
    if (showTime === '7pm') return 'bg-orange-100 text-orange-800 border-orange-200';
    if (showTime === '9pm') return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-gray-100 border-gray-200 text-gray-800';
  };

  const waitingGuests = checkedInGuests.filter(guest => !guest.hasBeenSeated);
  const allocatedGuests = checkedInGuests.filter(guest => guest.hasTableAllocated && !guest.hasBeenSeated);
  const seatedGuests = checkedInGuests.filter(guest => guest.hasBeenSeated);

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
            onTableAllocated={onTableAllocated}
            tables={tables.map(table => ({
              id: table.id,
              capacity: table.capacity,
              isOccupied: table.isOccupied,
              currentGuests: table.guests?.reduce((sum, guest) => sum + guest.count, 0)
            }))}
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
                          <div className="text-sm text-blue-800 font-medium">Table Allocated - Ready to Page</div>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {tables.map((table) => (
                    <Button
                      key={table.id}
                      variant="outline"
                      className={`h-20 flex flex-col items-center justify-center ${getTableStatusColor(table)}`}
                      onClick={() => !table.isOccupied && handleTableSelect(table.id)}
                      disabled={table.isOccupied}
                    >
                      <div className="font-semibold">Table {table.id}</div>
                      <div className="text-xs">{table.capacity} seats</div>
                      {table.isOccupied && (
                        <div className="text-xs mt-1">
                          {table.guests?.reduce((sum, guest) => sum + guest.count, 0)} guests
                        </div>
                      )}
                    </Button>
                  ))}
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
                      </div>
                    </div>
                    <Button 
                      onClick={handleAssignment}
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
              <CardTitle>Restaurant Layout</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {tables.map((table) => (
                  <Card key={table.id} className={`${table.isOccupied ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
                    <CardContent className="p-4 text-center">
                      <div className="font-bold text-lg">T{table.id}</div>
                      <div className="text-sm text-gray-600">{table.capacity} seats</div>
                      {table.isOccupied && table.guests && (
                        <div className="mt-2 space-y-1">
                          <div className="text-xs font-medium text-red-800">
                            {table.guests.reduce((sum, guest) => sum + guest.count, 0)} guests
                          </div>
                          {table.guests.map((guest, idx) => (
                            <div key={idx} className="text-xs text-red-700">{guest.name}</div>
                          ))}
                        </div>
                      )}
                      {table.isOccupied && (
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
                ))}
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
