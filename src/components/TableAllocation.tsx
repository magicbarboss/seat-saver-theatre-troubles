
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Users, Check, X } from 'lucide-react';

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
  // Initialize with a typical theatre table layout
  const [tables, setTables] = useState<Table[]>([
    { id: 1, seats: 2, isOccupied: false },
    { id: 2, seats: 4, isOccupied: false },
    { id: 3, seats: 6, isOccupied: false },
    { id: 4, seats: 2, isOccupied: false },
    { id: 5, seats: 4, isOccupied: false },
    { id: 6, seats: 6, isOccupied: false },
    { id: 7, seats: 2, isOccupied: false },
    { id: 8, seats: 4, isOccupied: false },
    { id: 9, seats: 6, isOccupied: false },
    { id: 10, seats: 2, isOccupied: false },
    { id: 11, seats: 4, isOccupied: false },
    { id: 12, seats: 6, isOccupied: false },
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

  const getTableColor = (table: Table) => {
    if (!table.isOccupied) return 'bg-green-100 border-green-300 hover:bg-green-200';
    return table.showTime === '7pm' 
      ? 'bg-orange-100 border-orange-300' 
      : 'bg-purple-100 border-purple-300';
  };

  const occupiedTables = tables.filter(t => t.isOccupied).length;
  const availableTables = tables.filter(t => !t.isOccupied).length;

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
          <CardTitle className="text-xl">🎭 Theatre Seating Layout</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {tables.map((table) => (
              <div
                key={table.id}
                className={`
                  p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
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
                  <div className="font-bold text-lg mb-1">Table {table.id}</div>
                  <div className="text-sm text-gray-600 mb-2">{table.seats} seats</div>
                  
                  {table.isOccupied ? (
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{table.guestName}</div>
                      <div className="text-xs text-gray-600">{table.guestCount} guests</div>
                      <div className="text-xs">
                        <Badge variant="outline" className="text-xs">
                          {table.showTime}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="mt-2 h-6 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearTable(table.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-green-600 font-medium text-sm">
                      Available
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TableAllocation;
