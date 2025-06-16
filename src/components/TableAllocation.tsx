import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Users, Check, X, Plus, Minus } from 'lucide-react';

interface Table {
  id: number;
  seats: number;
  isOccupied: boolean;
  guestName?: string;
  guestCount?: number;
  showTime?: string;
}

interface TableAllocationProps {
  onTableAssign: (tableId: number, guestName: string, guestCount: number, showTime: string) => void;
}

const TableAllocation = ({ onTableAssign }: TableAllocationProps) => {
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

  const [selectedGuest, setSelectedGuest] = useState<{
    name: string;
    count: number;
    showTime: string;
  } | null>(null);

  const assignTable = (tableId: number) => {
    if (!selectedGuest) return;

    setTables(prev => prev.map(table => 
      table.id === tableId 
        ? { 
            ...table, 
            isOccupied: true, 
            guestName: selectedGuest.name,
            guestCount: selectedGuest.count,
            showTime: selectedGuest.showTime
          }
        : table
    ));

    onTableAssign(tableId, selectedGuest.name, selectedGuest.count, selectedGuest.showTime);
    setSelectedGuest(null);
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
              ${selectedGuest ? 'hover:shadow-lg' : ''}
            `}
            onClick={() => {
              if (selectedGuest && !table.isOccupied) {
                assignTable(table.id);
              }
            }}
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
              ${selectedGuest ? 'hover:shadow-lg' : ''}
            `}
            onClick={() => {
              if (selectedGuest && !table.isOccupied) {
                assignTable(table.id);
              }
            }}
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

  return (
    <div className="space-y-6">
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
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full mb-2">
                  Assign Guest to Table
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select Guest Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Guest name"
                    className="w-full p-2 border rounded"
                    onChange={(e) => setSelectedGuest(prev => ({ ...prev!, name: e.target.value }))}
                  />
                  <input
                    type="number"
                    placeholder="Number of guests"
                    className="w-full p-2 border rounded"
                    onChange={(e) => setSelectedGuest(prev => ({ ...prev!, count: parseInt(e.target.value) }))}
                  />
                  <select
                    className="w-full p-2 border rounded"
                    onChange={(e) => setSelectedGuest(prev => ({ ...prev!, showTime: e.target.value }))}
                  >
                    <option value="">Select show time</option>
                    <option value="7pm">7pm Show</option>
                    <option value="9pm">9pm Show</option>
                  </select>
                  <Button 
                    onClick={() => {
                      if (selectedGuest?.name && selectedGuest?.count && selectedGuest?.showTime) {
                        // Guest details are set, now they can click on a table
                      }
                    }}
                    className="w-full"
                  >
                    Ready - Click on a Table
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
              <p>• Use +/- buttons to adjust seating for available tables</p>
              <p>• Dark gray seats face the stage, light gray seats have backs to stage</p>
              <p>• Tables 1-3 and 10-13 only have seats facing the stage</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TableAllocation;
