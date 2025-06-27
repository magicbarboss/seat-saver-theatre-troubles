import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, MapPin, Clock, Radio, Phone, CheckCircle, AlertCircle } from 'lucide-react';
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

  // Generate table layout (4 tables of 4, 4 tables of 6, 2 tables of 8)
  const generateTables = () => {
    const tables = [];
    
    // 4 tables of 4 people
    for (let i = 1; i <= 4; i++) {
      tables.push({ id: i, capacity: 4, type: 'small' });
    }
    
    // 4 tables of 6 people  
    for (let i = 5; i <= 8; i++) {
      tables.push({ id: i, capacity: 6, type: 'medium' });
    }
    
    // 2 tables of 8 people
    for (let i = 9; i <= 10; i++) {
      tables.push({ id: i, capacity: 8, type: 'large' });
    }
    
    return tables;
  };

  const tables = generateTables();

  // Filter guests who are checked in but not seated yet
  const availableGuests = checkedInGuests.filter(guest => 
    !guest.hasBeenSeated && 
    (searchTerm === '' || guest.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Get recommended tables for a guest
  const getRecommendedTables = (guestCount: number) => {
    return tables.filter(table => {
      if (guestCount <= table.capacity) return true;
      if (guestCount === table.capacity + 1) return true; // Allow +1 chair
      return false;
    }).sort((a, b) => {
      // Prefer exact matches, then slightly larger tables
      const aDiff = Math.abs(a.capacity - guestCount);
      const bDiff = Math.abs(b.capacity - guestCount);
      return aDiff - bDiff;
    });
  };

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

    // Call the allocation callback
    onTableAllocated(selectedGuest.originalIndex, selectedTables);
    
    // Reset selection
    setSelectedGuest(null);
    setSelectedTables([]);
  };

  const seatGuest = () => {
    if (!selectedGuest) return;

    // Mark guest as seated
    onGuestSeated(selectedGuest.originalIndex);
    
    // Release pager if assigned
    if (selectedGuest.pagerNumber) {
      onPagerRelease(selectedGuest.pagerNumber);
    }
    
    // Reset selection
    setSelectedGuest(null);
    setSelectedTables([]);

    toast({
      title: "✅ Guest Seated",
      description: `${selectedGuest.name} has been seated successfully`,
    });
  };

  const getTableStatus = (tableId: number) => {
    // Check if any guest is allocated to this table
    const allocatedGuest = checkedInGuests.find(guest => 
      guest.hasTableAllocated && !guest.hasBeenSeated
    );
    
    if (allocatedGuest) {
      return 'allocated';
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
      case 'allocated':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200';
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <MapPin className="h-6 w-6 mr-2 text-green-600" />
              Table Management
            </h2>
            <p className="text-gray-600 mt-1">Allocate tables and seat your guests</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-gray-700">{availableGuests.length}</span>
              <span className="text-gray-500">Awaiting Tables</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guests Awaiting Tables */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Guests Awaiting Tables ({availableGuests.length})
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
                      {guest.hasTableAllocated && (
                        <div className="mt-2">
                          <Badge className="bg-blue-100 text-blue-800 flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            Table Allocated - Ready to Page
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {availableGuests.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>All guests have been seated!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table Layout */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Restaurant Layout
            </CardTitle>
            {selectedGuest && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  Selecting table for: <strong>{selectedGuest.name}</strong> ({selectedGuest.count} guests)
                  {selectedGuest.pagerNumber && (
                    <span className="ml-2 text-purple-700">
                      • Pager #{selectedGuest.pagerNumber}
                    </span>
                  )}
                </p>
                {selectedGuest.count > 8 && (
                  <p className="text-sm text-amber-700 mt-1 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Large party - consider combining tables
                  </p>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Small Tables (4 people) */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Small Tables (4 people)</h4>
                <div className="grid grid-cols-2 gap-2">
                  {tables.filter(t => t.type === 'small').map((table) => (
                    <Button
                      key={table.id}
                      variant="outline"
                      className={`h-16 text-sm font-medium transition-colors ${getTableStyle(table.id)}`}
                      onClick={() => handleTableSelect(table.id)}
                      disabled={!selectedGuest}
                    >
                      <div className="text-center">
                        <div className="font-bold">Table {table.id}</div>
                        <div className="text-xs opacity-75">{table.capacity} seats</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Medium Tables (6 people) */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Medium Tables (6 people)</h4>
                <div className="grid grid-cols-2 gap-2">
                  {tables.filter(t => t.type === 'medium').map((table) => (
                    <Button
                      key={table.id}
                      variant="outline"
                      className={`h-16 text-sm font-medium transition-colors ${getTableStyle(table.id)}`}
                      onClick={() => handleTableSelect(table.id)}
                      disabled={!selectedGuest}
                    >
                      <div className="text-center">
                        <div className="font-bold">Table {table.id}</div>
                        <div className="text-xs opacity-75">{table.capacity} seats</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Large Tables (8 people) */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Large Tables (8 people)</h4>
                <div className="grid grid-cols-1 gap-2">
                  {tables.filter(t => t.type === 'large').map((table) => (
                    <Button
                      key={table.id}
                      variant="outline"
                      className={`h-16 text-sm font-medium transition-colors ${getTableStyle(table.id)}`}
                      onClick={() => handleTableSelect(table.id)}
                      disabled={!selectedGuest}
                    >
                      <div className="text-center">
                        <div className="font-bold">Table {table.id}</div>
                        <div className="text-xs opacity-75">{table.capacity} seats</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              {selectedGuest && (
                <div className="pt-4 border-t space-y-2">
                  {selectedTables.length > 0 && (
                    <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                      <strong>Selected:</strong> Table(s) {selectedTables.join(', ')} 
                      <span className="text-gray-600">
                        ({selectedTables.reduce((sum, tableId) => sum + (tables.find(t => t.id === tableId)?.capacity || 0), 0)} total seats)
                      </span>
                      {selectedGuest.pagerNumber && (
                        <div className="text-purple-700">
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
                      onClick={seatGuest}
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
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {selectedGuest && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Recommendations for {selectedGuest.name} ({selectedGuest.count} guests)
              {selectedGuest.pagerNumber && (
                <Badge className="ml-2 bg-purple-100 text-purple-800">
                  Pager #{selectedGuest.pagerNumber}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {getRecommendedTables(selectedGuest.count).slice(0, 3).map((table) => (
                <div
                  key={table.id}
                  className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleTableSelect(table.id)}
                >
                  <div className="text-center">
                    <div className="font-bold text-lg">Table {table.id}</div>
                    <div className="text-sm text-gray-600">
                      {table.capacity} seats ({table.type})
                    </div>
                    {selectedGuest.count > table.capacity && (
                      <div className="text-xs text-amber-600 mt-1">
                        +{selectedGuest.count - table.capacity} extra chair needed
                      </div>
                    )}
                    {selectedGuest.count === table.capacity && (
                      <div className="text-xs text-green-600 mt-1">
                        Perfect fit!
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TableAllocation;
