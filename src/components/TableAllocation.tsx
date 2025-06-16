import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Users, Check, X, Plus, Minus, AlertTriangle, Bell } from 'lucide-react';

interface Table {
  id: number;
  seats: number;
  isOccupied: boolean;
  guestName?: string;
  guestCount?: number;
  showTime?: string;
}

interface CheckedInGuest {
  name: string;
  count: number;
  showTime: string;
  originalIndex: number;
  pagerNumber?: number;
  hasBeenSeated?: boolean;
}

interface TableAllocationProps {
  onTableAssign: (tableId: number, guestName: string, guestCount: number, showTime: string) => void;
  checkedInGuests?: CheckedInGuest[];
  onPagerRelease?: (pagerNumber: number) => void;
}

const TableAllocation = ({ onTableAssign, checkedInGuests = [], onPagerRelease }: TableAllocationProps) => {
  // Initialize with your specific table layout
  const [tables, setTables] = useState<Table[]>([
    // Tables 1-3: 2 seats each (front row)
    { id: 1, seats: 2, isOccupied: false },
    { id: 2, seats: 2, isOccupied: false },
    { id: 3, seats: 2, isOccupied: false },
    // Tables 4-9: 4 seats each
    { id: 4, seats: 4, isOccupied: false },
    { id: 5, seats: 4, isOccupied: false },
    { id: 6, seats: 4, isOccupied: false },
    { id: 7, seats: 4, isOccupied: false },
    { id: 8, seats: 4, isOccupied: false },
    { id: 9, seats: 4, isOccupied: false },
    // Tables 10-13: 2 seats each (back row)
    { id: 10, seats: 2, isOccupied: false },
    { id: 11, seats: 2, isOccupied: false },
    { id: 12, seats: 2, isOccupied: false },
    { id: 13, seats: 2, isOccupied: false },
  ]);

  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [splitSuggestion, setSplitSuggestion] = useState<{
    guest: CheckedInGuest;
    tables: Table[];
  } | null>(null);
  const [showPagerReleaseDialog, setShowPagerReleaseDialog] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{
    guest: CheckedInGuest;
    tables: Table[];
  } | null>(null);

  // Updated adjacent table groups to include vertical adjacency
  const adjacentTableGroups = [
    [1, 2, 3], // Front row
    [4, 5, 6], // Row 2
    [7, 8, 9], // Row 3
    [10, 11, 12, 13], // Back row
    [4, 5], [5, 6], // Adjacent pairs in row 2
    [7, 8], [8, 9], // Adjacent pairs in row 3
    [10, 11], [11, 12], [12, 13], // Adjacent pairs in back row
    // Vertical adjacency
    [1, 4], [2, 5], [3, 6], // Front to row 2
    [4, 7], [5, 8], [6, 9], // Row 2 to row 3
    [7, 10], [8, 11], [9, 12], // Row 3 to back row
    // Extended vertical combinations
    [1, 4, 7], [2, 5, 8], [3, 6, 9], // Front through row 3
    [4, 7, 10], [5, 8, 11], [6, 9, 12], // Row 2 through back
  ];

  const getAdjacentTables = (tableId: number): number[] => {
    for (const group of adjacentTableGroups) {
      if (group.includes(tableId)) {
        return group.filter(id => id !== tableId);
      }
    }
    return [];
  };

  const getSuitableGuests = (table: Table) => {
    return checkedInGuests.filter(guest => guest.count <= table.seats);
  };

  const getLargeParties = (table: Table) => {
    return checkedInGuests.filter(guest => guest.count > table.seats);
  };

  const findSplitOptions = (guest: CheckedInGuest, clickedTable: Table) => {
    const adjacentTableIds = getAdjacentTables(clickedTable.id);
    const availableAdjacent = tables.filter(t => 
      adjacentTableIds.includes(t.id) && !t.isOccupied
    );

    const splitOptions: Table[][] = [];
    
    // Try combinations of clicked table + adjacent tables
    for (let i = 0; i < availableAdjacent.length; i++) {
      const combo = [clickedTable, availableAdjacent[i]];
      const totalSeats = combo.reduce((sum, t) => sum + t.seats, 0);
      if (totalSeats >= guest.count) {
        splitOptions.push(combo);
      }
    }

    // Try combinations of 3 tables if needed
    if (guest.count > clickedTable.seats + Math.max(...availableAdjacent.map(t => t.seats))) {
      for (let i = 0; i < availableAdjacent.length; i++) {
        for (let j = i + 1; j < availableAdjacent.length; j++) {
          const combo = [clickedTable, availableAdjacent[i], availableAdjacent[j]];
          const totalSeats = combo.reduce((sum, t) => sum + t.seats, 0);
          if (totalSeats >= guest.count) {
            splitOptions.push(combo);
          }
        }
      }
    }

    return splitOptions;
  };

  const handleTableClick = (table: Table) => {
    if (table.isOccupied) return;
    
    setSelectedTable(table);
    setShowAssignmentDialog(true);
    setSplitSuggestion(null);
  };

  const assignGuestToTable = (guest: CheckedInGuest, tablesToUse: Table[]) => {
    // Check if guest has a pager that needs to be released
    if (guest.pagerNumber && !guest.hasBeenSeated) {
      setPendingAssignment({ guest, tables: tablesToUse });
      setShowPagerReleaseDialog(true);
      return;
    }

    // Proceed with table assignment
    completeTableAssignment(guest, tablesToUse);
  };

  const completeTableAssignment = (guest: CheckedInGuest, tablesToUse: Table[]) => {
    const updatedTables = tables.map(table => {
      if (tablesToUse.some(t => t.id === table.id)) {
        return {
          ...table,
          isOccupied: true,
          guestName: guest.name,
          guestCount: guest.count,
          showTime: guest.showTime
        };
      }
      return table;
    });

    setTables(updatedTables);
    
    // Call the callback for each table
    tablesToUse.forEach(table => {
      onTableAssign(table.id, guest.name, guest.count, guest.showTime);
    });

    setShowAssignmentDialog(false);
    setSelectedTable(null);
    setSplitSuggestion(null);
    setShowPagerReleaseDialog(false);
    setPendingAssignment(null);
  };

  const handlePagerRelease = () => {
    if (pendingAssignment && pendingAssignment.guest.pagerNumber) {
      // Release the pager
      if (onPagerRelease) {
        onPagerRelease(pendingAssignment.guest.pagerNumber);
      }
      
      // Complete the table assignment
      completeTableAssignment(pendingAssignment.guest, pendingAssignment.tables);
    }
  };

  const suggestSplit = (guest: CheckedInGuest) => {
    if (!selectedTable) return;
    
    const splitOptions = findSplitOptions(guest, selectedTable);
    if (splitOptions.length > 0) {
      setSplitSuggestion({
        guest,
        tables: splitOptions[0] // Use the first (best) option
      });
    }
  };

  const clearTable = (tableId: number) => {
    setTables(prev => prev.map(table => 
      table.id === tableId 
        ? { ...table, isOccupied: false, guestName: undefined, guestCount: undefined, showTime: undefined }
        : table
    ));
  };

  const adjustSeating = (tableId: number, increment: boolean) => {
    setTables(prev => prev.map(table => {
      if (table.id === tableId && !table.isOccupied) {
        const newSeats = increment ? table.seats + 1 : Math.max(1, table.seats - 1);
        return { ...table, seats: Math.min(12, newSeats) }; // Max 12 seats per table
      }
      return table;
    }));
  };

  const getTableColor = (table: Table) => {
    if (!table.isOccupied) return 'bg-green-100 border-green-300 hover:bg-green-200';
    return table.showTime === '7pm' 
      ? 'bg-orange-100 border-orange-300' 
      : 'bg-purple-100 border-purple-300';
  };

  const occupiedTables = tables.filter(t => t.isOccupied).length;
  const availableTables = tables.filter(t => !t.isOccupied).length;

  // Define table rows for layout - front to back
  const tableRows = [
    { label: 'Front Row', tableIds: [1, 2, 3], distance: 'Closest to Stage' },
    { label: 'Row 2', tableIds: [4, 5, 6], distance: '' },
    { label: 'Row 3', tableIds: [7, 8, 9], distance: '' },
    { label: 'Back Row', tableIds: [10, 11, 12, 13], distance: 'Furthest from Stage' }
  ];

  const getTableById = (id: number) => tables.find(table => table.id === id);

  const renderSeatingAroundTable = (table: Table) => {
    const is2SeatTable = [1, 2, 3, 10, 11, 12, 13].includes(table.id);
    
    if (is2SeatTable) {
      // 2-seat tables: only seats at the back (facing stage)
      return (
        <div className="flex flex-col items-center space-y-2">
          {/* Seating behind table (facing stage) */}
          <div className="flex space-x-1">
            {Array.from({ length: table.seats }).map((_, i) => (
              <div key={i} className="w-4 h-4 bg-gray-400 rounded-full border border-gray-600"></div>
            ))}
          </div>
          
          {/* Table */}
          <div
            className={`
              p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 min-w-20
              ${getTableColor(table)}
              ${!table.isOccupied ? 'hover:shadow-lg' : ''}
            `}
            onClick={() => handleTableClick(table)}
          >
            <div className="text-center">
              <div className="font-bold text-sm mb-1">T{table.id}</div>
              
              {table.isOccupied ? (
                <div className="space-y-1">
                  <div className="font-medium text-xs">{table.guestName}</div>
                  <div className="text-xs text-gray-600">{table.guestCount}p</div>
                  <div className="text-xs">
                    <Badge variant="outline" className="text-xs py-0">
                      {table.showTime}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="mt-1 h-5 text-xs px-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearTable(table.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-green-600 font-medium text-xs">Free</div>
                  <div className="text-xs text-gray-500">{table.seats} seats</div>
                  <div className="flex justify-center space-x-1 mt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-5 w-5 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustSeating(table.id, false);
                      }}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-5 w-5 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustSeating(table.id, true);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    } else {
      // 4+ seat tables: seats on both sides
      const seatsPerSide = Math.ceil(table.seats / 2);
      const backSeats = seatsPerSide;
      const frontSeats = table.seats - seatsPerSide;

      return (
        <div className="flex flex-col items-center space-y-2">
          {/* Seating behind table (facing stage) */}
          <div className="flex space-x-1">
            {Array.from({ length: backSeats }).map((_, i) => (
              <div key={i} className="w-4 h-4 bg-gray-400 rounded-full border border-gray-600"></div>
            ))}
          </div>
          
          {/* Table */}
          <div
            className={`
              p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 min-w-20
              ${getTableColor(table)}
              ${!table.isOccupied ? 'hover:shadow-lg' : ''}
            `}
            onClick={() => handleTableClick(table)}
          >
            <div className="text-center">
              <div className="font-bold text-sm mb-1">T{table.id}</div>
              
              {table.isOccupied ? (
                <div className="space-y-1">
                  <div className="font-medium text-xs">{table.guestName}</div>
                  <div className="text-xs text-gray-600">{table.guestCount}p</div>
                  <div className="text-xs">
                    <Badge variant="outline" className="text-xs py-0">
                      {table.showTime}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="mt-1 h-5 text-xs px-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearTable(table.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-green-600 font-medium text-xs">Free</div>
                  <div className="text-xs text-gray-500">{table.seats} seats</div>
                  <div className="flex justify-center space-x-1 mt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-5 w-5 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustSeating(table.id, false);
                      }}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-5 w-5 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustSeating(table.id, true);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Seating in front of table (backs to stage) */}
          {frontSeats > 0 && (
            <div className="flex space-x-1">
              {Array.from({ length: frontSeats }).map((_, i) => (
                <div key={i} className="w-4 h-4 bg-gray-300 rounded-full border border-gray-400"></div>
              ))}
            </div>
          )}
        </div>
      );
    }
  };

  // Filter out guests who have already been seated
  const availableGuests = checkedInGuests.filter(guest => !guest.hasBeenSeated);

  return (
    <div className="space-y-6">
      {/* Table Assignment Dialog */}
      <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Guests to Table {selectedTable?.id}</DialogTitle>
          </DialogHeader>
          
          {selectedTable && (
            <div className="space-y-6">
              {/* Suitable guests (fit in this table) */}
              <div>
                <h4 className="font-medium mb-3">Guests that fit ({selectedTable.seats} seats available):</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {getSuitableGuests(selectedTable).filter(guest => availableGuests.includes(guest)).map((guest, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                      <div>
                        <div className="font-medium">{guest.name}</div>
                        <div className="text-sm text-gray-600">
                          {guest.count} guests • {guest.showTime}
                          {guest.pagerNumber && (
                            <span className="ml-2">
                              <Badge variant="outline" className="bg-blue-50">
                                <Bell className="h-3 w-3 mr-1" />
                                Pager {guest.pagerNumber}
                              </Badge>
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => assignGuestToTable(guest, [selectedTable])}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Assign
                      </Button>
                    </div>
                  ))}
                  {getSuitableGuests(selectedTable).filter(guest => availableGuests.includes(guest)).length === 0 && (
                    <p className="text-gray-500 text-center py-4">No available checked-in guests fit this table size</p>
                  )}
                </div>
              </div>

              {/* Large parties that need splitting */}
              {getLargeParties(selectedTable).filter(guest => availableGuests.includes(guest)).length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                    Large parties (need multiple tables):
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {getLargeParties(selectedTable).filter(guest => availableGuests.includes(guest)).map((guest, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-orange-50">
                        <div>
                          <div className="font-medium">{guest.name}</div>
                          <div className="text-sm text-gray-600">
                            {guest.count} guests • {guest.showTime}
                            {guest.pagerNumber && (
                              <span className="ml-2">
                                <Badge variant="outline" className="bg-blue-50">
                                  <Bell className="h-3 w-3 mr-1" />
                                  Pager {guest.pagerNumber}
                                </Badge>
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => suggestSplit(guest)}
                          className="border-orange-300"
                        >
                          Suggest Split
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Split Suggestion Dialog */}
      <Dialog open={splitSuggestion !== null} onOpenChange={() => setSplitSuggestion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Split Party Suggestion</DialogTitle>
          </DialogHeader>
          
          {splitSuggestion && (
            <div className="space-y-4">
              <p className="text-gray-700">
                <strong>{splitSuggestion.guest.name}</strong> has {splitSuggestion.guest.count} guests.
                {splitSuggestion.guest.pagerNumber && (
                  <span className="ml-2">
                    <Badge variant="outline" className="bg-blue-50">
                      <Bell className="h-3 w-3 mr-1" />
                      Pager {splitSuggestion.guest.pagerNumber}
                    </Badge>
                  </span>
                )}
              </p>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Suggested table combination:</h4>
                <div className="flex items-center space-x-2 mb-2">
                  {splitSuggestion.tables.map((table, idx) => (
                    <div key={table.id} className="flex items-center">
                      <Badge variant="outline" className="bg-white">
                        Table {table.id} ({table.seats} seats)
                      </Badge>
                      {idx < splitSuggestion.tables.length - 1 && (
                        <span className="mx-2 text-gray-500">+</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-600">
                  Total seats: {splitSuggestion.tables.reduce((sum, t) => sum + t.seats, 0)}
                </p>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={() => assignGuestToTable(splitSuggestion.guest, splitSuggestion.tables)}
                  className="flex-1"
                >
                  Split Party Across These Tables
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSplitSuggestion(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pager Release Dialog */}
      <Dialog open={showPagerReleaseDialog} onOpenChange={setShowPagerReleaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2 text-blue-600" />
              Release Pager
            </DialogTitle>
          </DialogHeader>
          
          {pendingAssignment && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-gray-700 mb-2">
                  <strong>{pendingAssignment.guest.name}</strong> is being seated at:
                </p>
                <div className="flex items-center space-x-2 mb-3">
                  {pendingAssignment.tables.map((table, idx) => (
                    <div key={table.id} className="flex items-center">
                      <Badge variant="outline" className="bg-white">
                        Table {table.id}
                      </Badge>
                      {idx < pendingAssignment.tables.length - 1 && (
                        <span className="mx-2 text-gray-500">+</span>
                      )}
                    </div>
                  ))}
                </div>
                {pendingAssignment.guest.pagerNumber && (
                  <div className="flex items-center space-x-2">
                    <Bell className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">
                      Please collect Pager {pendingAssignment.guest.pagerNumber} from the guests
                    </span>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={handlePagerRelease}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Pager Collected - Complete Seating
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPagerReleaseDialog(false);
                    setPendingAssignment(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-600" />
              Table Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Available:</span>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  {availableTables}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Occupied:</span>
                <Badge variant="outline" className="bg-red-50 text-red-700">
                  {occupiedTables}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <Badge variant="outline">{tables.length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span className="text-sm">Available</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
                <span className="text-sm">7pm Show</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
                <span className="text-sm">9pm Show</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                <span className="text-sm">Seats facing stage</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                <span className="text-sm">Seats back to stage</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Click any available table to see checked-in guests</p>
              <p>• Only guests that fit will be shown first</p>
              <p>• Large parties will get split suggestions for adjacent tables</p>
              <p>• Use +/- to adjust table seating</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">🎭 Dinner Theatre Layout</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* Stage */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-8 rounded-lg shadow-lg mx-auto max-w-md">
                <h2 className="text-2xl font-bold">🎭 STAGE 🎭</h2>
                <p className="text-sm opacity-90">Performance Area</p>
              </div>
            </div>

            {/* Seating Area */}
            <div className="space-y-6 bg-gray-50 p-6 rounded-lg">
              {tableRows.map((row, rowIndex) => (
                <div key={row.label} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-700">{row.label}</h3>
                    {row.distance && (
                      <span className="text-sm text-gray-500 italic">{row.distance}</span>
                    )}
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${row.tableIds.length}, 1fr)` }}>
                      {row.tableIds.map((tableId) => {
                        const table = getTableById(tableId);
                        if (!table) return null;
                        
                        return (
                          <div key={table.id}>
                            {renderSeatingAroundTable(table)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Legend for seating */}
            <div className="text-center text-sm text-gray-600 bg-blue-50 p-3 rounded">
              <p>• Click any available table to assign checked-in guests</p>
              <p>• Large parties will get suggestions for adjacent table splits (including T6+T9, T5+T8, etc.)</p>
              <p>• Pagers will be automatically released when guests are seated</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TableAllocation;
