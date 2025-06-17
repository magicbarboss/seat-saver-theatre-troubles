import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, MapPin, Utensils, Radio, CheckCircle, Plus, Minus } from 'lucide-react';
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

interface Table {
  id: number;
  name: string;
  capacity: number;
  status: 'AVAILABLE' | 'ALLOCATED' | 'OCCUPIED';
  allocatedTo?: string;
  allocatedGuest?: CheckedInGuest;
  splitWith?: number[];
  allocatedCount?: number;
}

const TableAllocation = ({ 
  onTableAssign, 
  checkedInGuests, 
  onPagerRelease, 
  onGuestSeated,
  onTableAllocated 
}: TableAllocationProps) => {
  const [tables, setTables] = useState<Table[]>([
    // Row 1 (Front) - T1, T2, T3 - 2 seats each, facing stage
    { id: 1, name: 'T1', capacity: 2, status: 'AVAILABLE' },
    { id: 2, name: 'T2', capacity: 2, status: 'AVAILABLE' },
    { id: 3, name: 'T3', capacity: 2, status: 'AVAILABLE' },
    // Row 2 - T4, T5, T6 - 4 seats each, back row access
    { id: 4, name: 'T4', capacity: 4, status: 'AVAILABLE' },
    { id: 5, name: 'T5', capacity: 4, status: 'AVAILABLE' },
    { id: 6, name: 'T6', capacity: 4, status: 'AVAILABLE' },
    // Row 3 - T7, T8, T9 - 4 seats each, back row access
    { id: 7, name: 'T7', capacity: 4, status: 'AVAILABLE' },
    { id: 8, name: 'T8', capacity: 4, status: 'AVAILABLE' },
    { id: 9, name: 'T9', capacity: 4, status: 'AVAILABLE' },
    // Row 4 (Back) - T10, T11, T12, T13 - 2 seats each, facing stage
    { id: 10, name: 'T10', capacity: 2, status: 'AVAILABLE' },
    { id: 11, name: 'T11', capacity: 2, status: 'AVAILABLE' },
    { id: 12, name: 'T12', capacity: 2, status: 'AVAILABLE' },
    { id: 13, name: 'T13', capacity: 2, status: 'AVAILABLE' },
  ]);

  const [selectedGuest, setSelectedGuest] = useState<CheckedInGuest | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  // Load table state from localStorage on mount
  useEffect(() => {
    const savedTables = localStorage.getItem('table-allocation-state');
    if (savedTables) {
      try {
        const parsedTables = JSON.parse(savedTables);
        setTables(parsedTables);
        console.log('Loaded table allocation state');
      } catch (error) {
        console.error('Failed to load table allocation state:', error);
      }
    }
  }, []);

  // Save table state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('table-allocation-state', JSON.stringify(tables));
  }, [tables]);

  // Update table statuses based on current guest states
  useEffect(() => {
    setTables(prevTables => 
      prevTables.map(table => {
        if (table.allocatedGuest) {
          // Check if the allocated guest is now seated
          const currentGuest = checkedInGuests.find(g => g.originalIndex === table.allocatedGuest?.originalIndex);
          if (currentGuest?.hasBeenSeated) {
            // Guest has been seated - mark table as occupied
            return { ...table, status: 'OCCUPIED' as const };
          } else if (!currentGuest) {
            // Guest is no longer checked in - free the table
            return { 
              id: table.id, 
              name: table.name, 
              capacity: table.capacity, 
              status: 'AVAILABLE' as const 
            };
          }
        }
        return table;
      })
    );
  }, [checkedInGuests]);

  // Get guests that can be assigned tables (checked in but not seated)
  const availableForAllocation = checkedInGuests.filter(guest => 
    !guest.hasBeenSeated && !guest.hasTableAllocated
  );

  const handleGuestSelect = (guest: CheckedInGuest) => {
    setSelectedGuest(guest);
    setShowAssignDialog(true);
  };

  // Get adjacent tables for larger groups
  const getAdjacentTables = (tableIds: number[]) => {
    const adjacentCombinations = [
      // Row 1 adjacent pairs
      [1, 2], [2, 3], [1, 2, 3],
      // Row 2 adjacent pairs
      [4, 5], [5, 6], [4, 5, 6],
      // Row 3 adjacent pairs
      [7, 8], [8, 9], [7, 8, 9],
      // Row 4 adjacent pairs
      [10, 11], [11, 12], [12, 13], [10, 11, 12], [11, 12, 13], [10, 11, 12, 13],
      // Vertical adjacent (same position in different rows)
      [1, 4], [2, 5], [3, 6], // Front to Row 2
      [4, 7], [5, 8], [6, 9], // Row 2 to Row 3
      [7, 10], [8, 11], [9, 12], // Row 3 to Back (some alignment)
      // Cross-row combinations for larger groups
      [6, 9], // T6 & T9 (vertically adjacent)
      [4, 5, 7, 8], // 4-table combination
    ];

    return adjacentCombinations.filter(combo => 
      combo.every(id => tableIds.includes(id)) && combo.length === tableIds.length
    );
  };

  const canCombineTables = (tableIds: number[], guestCount: number) => {
    const selectedTables = tables.filter(t => tableIds.includes(t.id));
    const totalCapacity = selectedTables.reduce((sum, t) => sum + t.capacity, 0);
    
    // Check if tables are available and have enough total capacity
    const allAvailable = selectedTables.every(t => t.status === 'AVAILABLE');
    const hasCapacity = totalCapacity >= guestCount;
    
    // Check if tables are adjacent
    const isAdjacent = getAdjacentTables(tableIds).length > 0;
    
    return allAvailable && hasCapacity && (tableIds.length === 1 || isAdjacent);
  };

  const assignTable = (tableIds: number[]) => {
    if (!selectedGuest) return;

    const selectedTables = tables.filter(t => tableIds.includes(t.id));
    const totalCapacity = selectedTables.reduce((sum, t) => sum + t.capacity, 0);

    if (selectedGuest.count > totalCapacity) {
      toast({
        title: "❌ Insufficient Capacity",
        description: `Table(s) can only seat ${totalCapacity} guests, but ${selectedGuest.name} has ${selectedGuest.count} guests.`,
        variant: "destructive"
      });
      return;
    }

    // Check if all tables are available
    const allAvailable = selectedTables.every(t => t.status === 'AVAILABLE');
    if (!allAvailable) {
      toast({
        title: "❌ Table Unavailable",
        description: "One or more selected tables are not available.",
        variant: "destructive"
      });
      return;
    }

    // Update table status to ALLOCATED
    setTables(prevTables =>
      prevTables.map(table => {
        if (tableIds.includes(table.id)) {
          return {
            ...table,
            status: 'ALLOCATED' as const,
            allocatedTo: selectedGuest.name,
            allocatedGuest: selectedGuest,
            allocatedCount: selectedGuest.count,
            splitWith: tableIds.length > 1 ? tableIds.filter(id => id !== table.id) : undefined
          };
        }
        return table;
      })
    );

    // Call the parent callback to track allocation
    onTableAllocated(selectedGuest.originalIndex, tableIds);

    const tableNames = selectedTables.map(t => t.name).join(' & ');
    onTableAssign(tableIds[0], selectedGuest.name, selectedGuest.count, selectedGuest.showTime);

    toast({
      title: "📍 Table Allocated",
      description: `${selectedGuest.name} (${selectedGuest.count} guests) allocated to ${tableNames}. Page when ready!`,
    });

    setShowAssignDialog(false);
    setSelectedGuest(null);
  };

  const markGuestSeated = (table: Table) => {
    if (!table.allocatedGuest) return;

    // Mark guest as seated
    onGuestSeated(table.allocatedGuest.originalIndex);

    // Update table status to OCCUPIED
    setTables(prevTables =>
      prevTables.map(t => {
        if (t.id === table.id || (table.splitWith && table.splitWith.includes(t.id))) {
          return { ...t, status: 'OCCUPIED' as const };
        }
        return t;
      })
    );

    toast({
      title: "✅ Guest Seated",
      description: `${table.allocatedGuest.name} has been seated at ${table.name}${table.splitWith ? ` & T${table.splitWith.join(' & T')}` : ''}`,
    });
  };

  const freeTable = (tableId: number) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    const tablesToFree = [tableId];
    if (table.splitWith) {
      tablesToFree.push(...table.splitWith);
    }

    setTables(prevTables =>
      prevTables.map(t => {
        if (tablesToFree.includes(t.id)) {
          return {
            id: t.id,
            name: t.name,
            capacity: t.capacity,
            status: 'AVAILABLE' as const
          };
        }
        return t;
      })
    );

    toast({
      title: "🔄 Table Freed",
      description: `${table.name}${table.splitWith ? ` & T${table.splitWith.join(' & T')}` : ''} is now available`,
    });
  };

  const adjustAllocation = (tableId: number, change: number) => {
    setTables(prevTables =>
      prevTables.map(table => {
        if (table.id === tableId && table.allocatedCount) {
          const newCount = Math.max(1, Math.min(table.capacity, table.allocatedCount + change));
          return { ...table, allocatedCount: newCount };
        }
        return table;
      })
    );
  };

  const addSeatsToTable = (tableId: number, additionalSeats: number) => {
    setTables(prevTables =>
      prevTables.map(table => {
        if (table.id === tableId) {
          const newCapacity = table.capacity + additionalSeats;
          return { ...table, capacity: newCapacity };
        }
        return table;
      })
    );

    const table = tables.find(t => t.id === tableId);
    if (table) {
      toast({
        title: "🪑 Seats Added",
        description: `Added ${additionalSeats} seat(s) to ${table.name}. New capacity: ${table.capacity + additionalSeats}`,
      });
    }
  };

  const adjustTableCapacity = (tableId: number, change: number) => {
    setTables(prevTables =>
      prevTables.map(table => {
        if (table.id === tableId) {
          const newCapacity = Math.max(1, table.capacity + change);
          return { ...table, capacity: newCapacity };
        }
        return table;
      })
    );

    const table = tables.find(t => t.id === tableId);
    if (table) {
      const action = change > 0 ? 'Added' : 'Removed';
      const seats = Math.abs(change);
      toast({
        title: `🪑 Seats ${action}`,
        description: `${action} ${seats} seat(s) ${change > 0 ? 'to' : 'from'} ${table.name}. New capacity: ${table.capacity + change}`,
      });
    }
  };

  const getTableColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-100 border-green-300 hover:bg-green-150';
      case 'ALLOCATED': return 'bg-blue-100 border-blue-300';
      case 'OCCUPIED': return 'bg-red-100 border-red-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return <Badge className="bg-green-600">Available</Badge>;
      case 'ALLOCATED': return <Badge className="bg-blue-600">Allocated</Badge>;
      case 'OCCUPIED': return <Badge className="bg-red-600">Occupied</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  // Organize tables by the new layout
  const organizeTablesByRows = () => {
    // Row 1 (Front): T1, T2, T3 - facing stage
    const row1 = tables.filter(t => [1, 2, 3].includes(t.id));
    // Row 2: T4, T5, T6 - back row access
    const row2 = tables.filter(t => [4, 5, 6].includes(t.id));
    // Row 3: T7, T8, T9 - same as row 2
    const row3 = tables.filter(t => [7, 8, 9].includes(t.id));
    // Row 4 (Back): T10, T11, T12, T13 - facing stage
    const row4 = tables.filter(t => [10, 11, 12, 13].includes(t.id));

    return { row1, row2, row3, row4 };
  };

  return (
    <div className="space-y-6">
      {/* Guests waiting for table allocation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Guests Awaiting Table Allocation ({availableForAllocation.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableForAllocation.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No guests waiting for table allocation</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableForAllocation.map((guest) => (
                <div
                  key={guest.originalIndex}
                  className="p-4 border rounded-lg bg-yellow-50 border-yellow-200 cursor-pointer hover:bg-yellow-100 transition-colors"
                  onClick={() => handleGuestSelect(guest)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">{guest.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {guest.showTime}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      <Users className="h-4 w-4 inline mr-1" />
                      {guest.count} guests
                    </span>
                    {guest.pagerNumber && (
                      <Badge className="bg-purple-100 text-purple-800">
                        Pager #{guest.pagerNumber}
                      </Badge>
                    )}
                  </div>
                  <Button className="w-full mt-3" size="sm">
                    Assign Table
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table Layout - Updated with proper capacities and controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Utensils className="h-5 w-5" />
            <span>Table Layout (Venue Setup)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Stage indicator */}
            <div className="text-center py-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg border-2 border-dashed border-purple-300">
              <span className="text-lg font-bold text-purple-700">🎭 STAGE 🎭</span>
            </div>

            {/* Render tables by rows */}
            {Object.entries(organizeTablesByRows()).map(([rowName, rowTables]) => (
              <div key={rowName} className="space-y-2">
                <h4 className="text-sm font-medium text-gray-600">
                  {rowName === 'row1' && 'Row 1 (Front) - 2 seats each, facing stage'}
                  {rowName === 'row2' && 'Row 2 - 4 seats each, back row access, facing forward'}
                  {rowName === 'row3' && 'Row 3 - 4 seats each, back row access, facing forward'}
                  {rowName === 'row4' && 'Row 4 (Back) - 2 seats each, facing stage'}
                </h4>
                <div className={`grid gap-4 ${rowName === 'row1' || rowName === 'row4' ? (rowName === 'row4' ? 'grid-cols-4' : 'grid-cols-3') : 'grid-cols-3'}`}>
                  {rowTables.map((table) => (
                    <div
                      key={table.id}
                      className={`p-4 border-2 rounded-lg transition-all ${getTableColor(table.status)}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg">{table.name}</h3>
                        {getStatusBadge(table.status)}
                      </div>
                      
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">
                          Capacity: {table.capacity} guests
                        </p>
                        {/* Plus/Minus buttons for capacity */}
                        <div className="flex items-center space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => adjustTableCapacity(table.id, -1)}
                            className="h-6 w-6 p-0"
                            title="Remove seat"
                            disabled={table.capacity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => adjustTableCapacity(table.id, 1)}
                            className="h-6 w-6 p-0"
                            title="Add seat"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {table.allocatedTo && (
                        <div className="mb-3">
                          <p className="font-medium text-sm text-gray-800">{table.allocatedTo}</p>
                          {table.allocatedGuest && (
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-gray-600">
                                {table.allocatedCount || table.allocatedGuest.count} guests
                              </span>
                              {table.allocatedGuest.pagerNumber && (
                                <Badge className="bg-purple-100 text-purple-800 text-xs">
                                  #{table.allocatedGuest.pagerNumber}
                                </Badge>
                              )}
                            </div>
                          )}
                          {table.splitWith && (
                            <p className="text-xs text-blue-600 mt-1">
                              Split with T{table.splitWith.join(' & T')}
                            </p>
                          )}
                        </div>
                      )}

                      {table.status === 'ALLOCATED' && table.allocatedGuest && (
                        <div className="space-y-2">
                          {/* +/- buttons for adjusting allocation */}
                          <div className="flex items-center justify-center space-x-2 mb-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => adjustAllocation(table.id, -1)}
                              className="h-6 w-6 p-0"
                              disabled={(table.allocatedCount || table.allocatedGuest.count) <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-bold min-w-8 text-center">
                              {table.allocatedCount || table.allocatedGuest.count}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => adjustAllocation(table.id, 1)}
                              className="h-6 w-6 p-0"
                              disabled={(table.allocatedCount || table.allocatedGuest.count) >= table.capacity}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <Button
                            size="sm"
                            onClick={() => markGuestSeated(table)}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Seated
                          </Button>
                        </div>
                      )}

                      {table.status === 'OCCUPIED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => freeTable(table.id)}
                          className="w-full"
                        >
                          Free Table
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table Assignment Dialog - Updated with adjacent table options */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Assign Table for {selectedGuest?.name} ({selectedGuest?.count} guests)
            </DialogTitle>
          </DialogHeader>
          
          {selectedGuest && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">{selectedGuest.name}</span>
                  <span className="text-gray-600 ml-2">({selectedGuest.count} guests)</span>
                </div>
                <Badge variant="outline">{selectedGuest.showTime}</Badge>
                {selectedGuest.pagerNumber && (
                  <Badge className="bg-purple-100 text-purple-800">
                    Pager #{selectedGuest.pagerNumber}
                  </Badge>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Available Tables:</h4>
                
                {/* Single Tables */}
                <div className="grid grid-cols-4 gap-3">
                  {tables
                    .filter(table => table.status === 'AVAILABLE' && table.capacity >= selectedGuest.count)
                    .map((table) => (
                      <Button
                        key={table.id}
                        variant="outline"
                        onClick={() => assignTable([table.id])}
                        className="p-4 h-auto flex flex-col"
                      >
                        <span className="font-bold">{table.name}</span>
                        <span className="text-sm text-gray-600">
                          {table.capacity} seats
                        </span>
                      </Button>
                    ))}
                </div>

                {/* Adjacent Table Combinations for larger groups */}
                {selectedGuest.count > Math.max(...tables.filter(t => t.status === 'AVAILABLE').map(t => t.capacity)) && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Adjacent Table Combinations:</h4>
                    <div className="space-y-2">
                      {/* Row combinations */}
                      {canCombineTables([1, 2], selectedGuest.count) && (
                        <Button
                          variant="outline"
                          onClick={() => assignTable([1, 2])}
                          className="w-full p-4 h-auto"
                        >
                          <div className="text-center">
                            <div className="font-bold">T1 & T2 (Adjacent)</div>
                            <div className="text-sm text-gray-600">
                              Combined capacity: {tables.find(t => t.id === 1)?.capacity + tables.find(t => t.id === 2)?.capacity} seats
                            </div>
                          </div>
                        </Button>
                      )}
                      
                      {canCombineTables([2, 3], selectedGuest.count) && (
                        <Button
                          variant="outline"
                          onClick={() => assignTable([2, 3])}
                          className="w-full p-4 h-auto"
                        >
                          <div className="text-center">
                            <div className="font-bold">T2 & T3 (Adjacent)</div>
                            <div className="text-sm text-gray-600">
                              Combined capacity: {tables.find(t => t.id === 2)?.capacity + tables.find(t => t.id === 3)?.capacity} seats
                            </div>
                          </div>
                        </Button>
                      )}

                      {canCombineTables([4, 5], selectedGuest.count) && (
                        <Button
                          variant="outline"
                          onClick={() => assignTable([4, 5])}
                          className="w-full p-4 h-auto"
                        >
                          <div className="text-center">
                            <div className="font-bold">T4 & T5 (Adjacent)</div>
                            <div className="text-sm text-gray-600">
                              Combined capacity: {tables.find(t => t.id === 4)?.capacity + tables.find(t => t.id === 5)?.capacity} seats
                            </div>
                          </div>
                        </Button>
                      )}

                      {canCombineTables([5, 6], selectedGuest.count) && (
                        <Button
                          variant="outline"
                          onClick={() => assignTable([5, 6])}
                          className="w-full p-4 h-auto"
                        >
                          <div className="text-center">
                            <div className="font-bold">T5 & T6 (Adjacent)</div>
                            <div className="text-sm text-gray-600">
                              Combined capacity: {tables.find(t => t.id === 5)?.capacity + tables.find(t => t.id === 6)?.capacity} seats
                            </div>
                          </div>
                        </Button>
                      )}

                      {/* Add more adjacent combinations as needed */}
                    </div>
                  </div>
                )}

                {tables.filter(table => table.status === 'AVAILABLE' && canCombineTables([table.id], selectedGuest.count)).length === 0 && (
                  <p className="text-red-600 text-center py-4">
                    No suitable tables or combinations available for {selectedGuest.count} guests
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TableAllocation;
