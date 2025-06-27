
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, MapPin, Clock, Radio, Phone, CheckCircle, AlertCircle, Plus, Minus } from 'lucide-react';
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
  const [selectedGuest, setSelectedGuest] = useState<CheckedInGuest | null>(null);
  const [selectedTables, setSelectedTables] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tableCapacities, setTableCapacities] = useState<{[key: number]: number}>({
    1: 2, 2: 2, 3: 2,
    4: 4, 5: 4, 6: 4, 7: 4, 8: 4, 9: 4,
    10: 2, 11: 2, 12: 2, 13: 2
  });
  const [tableAllocations, setTableAllocations] = useState<{[key: number]: CheckedInGuest}>({});

  // Filter guests who are checked in but not seated yet
  const availableGuests = checkedInGuests.filter(guest => 
    !guest.hasBeenSeated && 
    (searchTerm === '' || guest.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleTableSelect = (tableId: number) => {
    setSelectedTables(prev => {
      if (prev.includes(tableId)) {
        return prev.filter(id => id !== tableId);
      } else {
        return [...prev, tableId];
      }
    });
  };

  const allocateTable = () => {
    if (!selectedGuest || selectedTables.length === 0) return;

    // Update table allocations
    const newAllocations = { ...tableAllocations };
    selectedTables.forEach(tableId => {
      newAllocations[tableId] = selectedGuest;
    });
    setTableAllocations(newAllocations);

    onTableAllocated(selectedGuest.originalIndex, selectedTables);
    
    setSelectedGuest(null);
    setSelectedTables([]);
    
    toast({
      title: "✅ Table Allocated",
      description: `Table(s) ${selectedTables.join(', ')} allocated to ${selectedGuest.name}${selectedGuest.pagerNumber ? ` (Pager #${selectedGuest.pagerNumber})` : ''}`,
    });
  };

  const seatGuest = (guest: CheckedInGuest) => {
    onGuestSeated(guest.originalIndex);
    
    if (guest.pagerNumber) {
      onPagerRelease(guest.pagerNumber);
    }
    
    // Remove from table allocations
    const newAllocations = { ...tableAllocations };
    Object.keys(newAllocations).forEach(tableId => {
      if (newAllocations[parseInt(tableId)]?.originalIndex === guest.originalIndex) {
        delete newAllocations[parseInt(tableId)];
      }
    });
    setTableAllocations(newAllocations);

    toast({
      title: "✅ Guest Seated",
      description: `${guest.name} has been seated successfully`,
    });
  };

  const adjustTableCapacity = (tableId: number, change: number) => {
    setTableCapacities(prev => ({
      ...prev,
      [tableId]: Math.max(1, prev[tableId] + change)
    }));
  };

  const getTableStatus = (tableId: number) => {
    const allocatedGuest = tableAllocations[tableId];
    
    if (allocatedGuest) {
      return allocatedGuest.hasBeenSeated ? 'occupied' : 'allocated';
    }
    
    return 'available';
  };

  const getTableStyle = (tableId: number) => {
    const status = getTableStatus(tableId);
    const isSelected = selectedTables.includes(tableId);
    
    if (isSelected) {
      return 'bg-blue-500 text-white border-blue-600';
    }
    
    switch (status) {
      case 'occupied':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'allocated':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200';
    }
  };

  const renderTable = (tableId: number, position: string = '') => {
    const allocatedGuest = tableAllocations[tableId];
    
    return (
      <div key={tableId} className="flex flex-col items-center space-y-1">
        <Button
          variant="outline"
          className={`h-16 w-20 text-xs font-medium transition-colors ${getTableStyle(tableId)}`}
          onClick={() => handleTableSelect(tableId)}
          disabled={!selectedGuest || getTableStatus(tableId) === 'occupied'}
        >
          <div className="text-center">
            <div className="font-bold">T{tableId}</div>
            <div className="text-xs opacity-75">({tableCapacities[tableId]})</div>
            {allocatedGuest && (
              <div className="text-xs mt-1 font-medium">
                {allocatedGuest.name.split(' ')[0]}
                {allocatedGuest.pagerNumber && (
                  <div className="text-xs">P#{allocatedGuest.pagerNumber}</div>
                )}
              </div>
            )}
          </div>
        </Button>
        
        <div className="flex items-center space-x-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-6 p-0"
            onClick={() => adjustTableCapacity(tableId, -1)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-6 p-0"
            onClick={() => adjustTableCapacity(tableId, 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        
        {allocatedGuest && !allocatedGuest.hasBeenSeated && (
          <Button
            size="sm"
            onClick={() => seatGuest(allocatedGuest)}
            className="text-xs bg-green-600 hover:bg-green-700"
          >
            Seat Now
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <MapPin className="h-6 w-6 mr-2 text-green-600" />
              Table Allocation
            </h2>
            <p className="text-gray-600 mt-1">Theatre seating layout</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-gray-700">{availableGuests.length}</span>
              <span className="text-gray-500">Ready to Allocate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Guests Ready to Allocate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Guests Ready to Allocate ({availableGuests.length})
          </CardTitle>
          <Input
            placeholder="Search guests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-2"
          />
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {availableGuests.map((guest) => (
              <div
                key={guest.originalIndex}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedGuest?.originalIndex === guest.originalIndex 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedGuest(guest)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">{guest.name}</h4>
                    <div className="flex items-center space-x-3 mt-2">
                      <Badge variant="outline" className="flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {guest.count} guests
                      </Badge>
                      <Badge variant="outline" className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {guest.showTime}
                      </Badge>
                      {guest.pagerNumber && (
                        <Badge className="bg-purple-100 text-purple-800 flex items-center">
                          <Radio className="h-3 w-3 mr-1" />
                          Pager #{guest.pagerNumber}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {availableGuests.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>All guests have been allocated!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Theatre Layout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Theatre Layout
            {selectedGuest && (
              <div className="ml-4 text-sm bg-blue-50 px-3 py-1 rounded">
                Selecting for: <strong>{selectedGuest.name}</strong> ({selectedGuest.count} guests)
                {selectedGuest.pagerNumber && (
                  <span className="ml-2 text-purple-700">
                    • Pager #{selectedGuest.pagerNumber}
                  </span>
                )}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* Front Section - Tables 1, 2, 3 (2 seats each) */}
            <div>
              <h4 className="font-medium text-gray-700 mb-4 text-center">Front Section</h4>
              <div className="flex justify-center space-x-8">
                {[1, 2, 3].map(tableId => renderTable(tableId, 'Front'))}
              </div>
            </div>

            {/* Middle Section - Tables 4, 5, 6, 7, 8, 9 (4 seats each) */}
            <div>
              <h4 className="font-medium text-gray-700 mb-4 text-center">Middle Section</h4>
              <div className="flex justify-center space-x-4">
                {[4, 5, 6, 7, 8, 9].map(tableId => renderTable(tableId, 'Middle'))}
              </div>
            </div>

            {/* Back Section - Tables 10, 11, 12, 13 (2 seats each) */}
            <div>
              <h4 className="font-medium text-gray-700 mb-4 text-center">Back Section</h4>
              <div className="flex justify-center space-x-8">
                {[10, 11, 12, 13].map(tableId => renderTable(tableId, 'Back'))}
              </div>
            </div>

            {/* Action Buttons */}
            {selectedGuest && (
              <div className="pt-4 border-t space-y-2">
                {selectedTables.length > 0 && (
                  <div className="mb-3 p-3 bg-gray-50 rounded text-sm">
                    <strong>Selected Tables:</strong> {selectedTables.join(', ')} 
                    <span className="text-gray-600">
                      ({selectedTables.reduce((sum, tableId) => sum + tableCapacities[tableId], 0)} total seats)
                    </span>
                    {selectedGuest.pagerNumber && (
                      <div className="text-purple-700 mt-1">
                        <Radio className="h-3 w-3 inline mr-1" />
                        Pager #{selectedGuest.pagerNumber}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <Button
                    onClick={allocateTable}
                    disabled={selectedTables.length === 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Allocate Table
                  </Button>
                  
                  <Button
                    onClick={() => selectedGuest && seatGuest(selectedGuest)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Seat Now
                  </Button>
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedGuest(null);
                    setSelectedTables([]);
                  }}
                  className="w-full"
                >
                  Cancel Selection
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TableAllocation;
