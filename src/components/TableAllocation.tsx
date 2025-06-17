
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, MapPin, Utensils, Radio, CheckCircle, Plus, Minus, ArrowRightLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CheckedInGuest {
  name: string;
  count: number;
  showTime: string;
  originalIndex: number;
  pagerNumber?: number;
  hasBeenSeated?: boolean;
  hasTableAllocated?: boolean;
  notes?: string;
}

interface TableAllocationProps {
  onTableAssign: (tableId: number, guestName: string, guestCount: number, showTime: string) => void;
  checkedInGuests: CheckedInGuest[];
  onPagerRelease: (pagerNumber: number) => void;
  onGuestSeated: (guestIndex: number) => void;
  onTableAllocated: (guestIndex: number, tableIds: number[]) => void;
}

interface TableSection {
  id: string;
  tableId: number;
  section: 'front' | 'back';
  capacity: number;
  status: 'AVAILABLE' | 'ALLOCATED' | 'OCCUPIED';
  allocatedTo?: string;
  allocatedGuest?: CheckedInGuest;
  allocatedCount?: number;
}

interface Table {
  id: number;
  name: string;
  front: TableSection;
  back: TableSection;
}

const TableAllocation = ({ 
  onTableAssign, 
  checkedInGuests, 
  onPagerRelease, 
  onGuestSeated,
  onTableAllocated 
}: TableAllocationProps) => {
  const [tables, setTables] = useState<Table[]>([
    // Row 1 (Front) - T1, T2, T3 - 2 seats each section
    { 
      id: 1, 
      name: 'T1',
      front: { id: '1-front', tableId: 1, section: 'front', capacity: 1, status: 'AVAILABLE' },
      back: { id: '1-back', tableId: 1, section: 'back', capacity: 1, status: 'AVAILABLE' }
    },
    { 
      id: 2, 
      name: 'T2',
      front: { id: '2-front', tableId: 2, section: 'front', capacity: 1, status: 'AVAILABLE' },
      back: { id: '2-back', tableId: 2, section: 'back', capacity: 1, status: 'AVAILABLE' }
    },
    { 
      id: 3, 
      name: 'T3',
      front: { id: '3-front', tableId: 3, section: 'front', capacity: 1, status: 'AVAILABLE' },
      back: { id: '3-back', tableId: 3, section: 'back', capacity: 1, status: 'AVAILABLE' }
    },
    // Row 2 - T4, T5, T6 - 4 seats each (2 front, 2 back)
    { 
      id: 4, 
      name: 'T4',
      front: { id: '4-front', tableId: 4, section: 'front', capacity: 2, status: 'AVAILABLE' },
      back: { id: '4-back', tableId: 4, section: 'back', capacity: 2, status: 'AVAILABLE' }
    },
    { 
      id: 5, 
      name: 'T5',
      front: { id: '5-front', tableId: 5, section: 'front', capacity: 2, status: 'AVAILABLE' },
      back: { id: '5-back', tableId: 5, section: 'back', capacity: 2, status: 'AVAILABLE' }
    },
    { 
      id: 6, 
      name: 'T6',
      front: { id: '6-front', tableId: 6, section: 'front', capacity: 2, status: 'AVAILABLE' },
      back: { id: '6-back', tableId: 6, section: 'back', capacity: 2, status: 'AVAILABLE' }
    },
    // Row 3 - T7, T8, T9 - 4 seats each (2 front, 2 back)
    { 
      id: 7, 
      name: 'T7',
      front: { id: '7-front', tableId: 7, section: 'front', capacity: 2, status: 'AVAILABLE' },
      back: { id: '7-back', tableId: 7, section: 'back', capacity: 2, status: 'AVAILABLE' }
    },
    { 
      id: 8, 
      name: 'T8',
      front: { id: '8-front', tableId: 8, section: 'front', capacity: 2, status: 'AVAILABLE' },
      back: { id: '8-back', tableId: 8, section: 'back', capacity: 2, status: 'AVAILABLE' }
    },
    { 
      id: 9, 
      name: 'T9',
      front: { id: '9-front', tableId: 9, section: 'front', capacity: 2, status: 'AVAILABLE' },
      back: { id: '9-back', tableId: 9, section: 'back', capacity: 2, status: 'AVAILABLE' }
    },
    // Row 4 (Back) - T10, T11, T12, T13 - 2 seats each (1 front, 1 back)
    { 
      id: 10, 
      name: 'T10',
      front: { id: '10-front', tableId: 10, section: 'front', capacity: 1, status: 'AVAILABLE' },
      back: { id: '10-back', tableId: 10, section: 'back', capacity: 1, status: 'AVAILABLE' }
    },
    { 
      id: 11, 
      name: 'T11',
      front: { id: '11-front', tableId: 11, section: 'front', capacity: 1, status: 'AVAILABLE' },
      back: { id: '11-back', tableId: 11, section: 'back', capacity: 1, status: 'AVAILABLE' }
    },
    { 
      id: 12, 
      name: 'T12',
      front: { id: '12-front', tableId: 12, section: 'front', capacity: 1, status: 'AVAILABLE' },
      back: { id: '12-back', tableId: 12, section: 'back', capacity: 1, status: 'AVAILABLE' }
    },
    { 
      id: 13, 
      name: 'T13',
      front: { id: '13-front', tableId: 13, section: 'front', capacity: 1, status: 'AVAILABLE' },
      back: { id: '13-back', tableId: 13, section: 'back', capacity: 1, status: 'AVAILABLE' }
    },
  ]);

  const [selectedGuest, setSelectedGuest] = useState<CheckedInGuest | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [guestToMove, setGuestToMove] = useState<CheckedInGuest | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [currentSectionId, setCurrentSectionId] = useState<string>('');

  // Load table state from localStorage on mount
  useEffect(() => {
    const savedTables = localStorage.getItem('table-allocation-state-v2');
    if (savedTables) {
      try {
        const parsedTables = JSON.parse(savedTables);
        setTables(parsedTables);
        console.log('Loaded table allocation state v2');
      } catch (error) {
        console.error('Failed to load table allocation state:', error);
      }
    }
  }, []);

  // Save table state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('table-allocation-state-v2', JSON.stringify(tables));
  }, [tables]);

  // Update table statuses based on current guest states
  useEffect(() => {
    setTables(prevTables => 
      prevTables.map(table => ({
        ...table,
        front: table.front.allocatedGuest ? {
          ...table.front,
          status: checkedInGuests.find(g => g.originalIndex === table.front.allocatedGuest?.originalIndex)?.hasBeenSeated 
            ? 'OCCUPIED' as const 
            : !checkedInGuests.find(g => g.originalIndex === table.front.allocatedGuest?.originalIndex)
            ? 'AVAILABLE' as const
            : table.front.status
        } : table.front,
        back: table.back.allocatedGuest ? {
          ...table.back,
          status: checkedInGuests.find(g => g.originalIndex === table.back.allocatedGuest?.originalIndex)?.hasBeenSeated 
            ? 'OCCUPIED' as const 
            : !checkedInGuests.find(g => g.originalIndex === table.back.allocatedGuest?.originalIndex)
            ? 'AVAILABLE' as const
            : table.back.status
        } : table.back
      }))
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

  const handleMoveGuest = (guest: CheckedInGuest, sectionId: string) => {
    setGuestToMove(guest);
    setCurrentSectionId(sectionId);
    setShowMoveDialog(true);
  };

  const assignTableSection = (sectionId: string) => {
    if (!selectedGuest) return;

    const table = tables.find(t => t.front.id === sectionId || t.back.id === sectionId);
    const section = table?.front.id === sectionId ? table.front : table?.back;
    
    if (!table || !section) return;

    if (selectedGuest.count > section.capacity) {
      toast({
        title: "❌ Insufficient Capacity",
        description: `${table.name} ${section.section} can only seat ${section.capacity} guests, but ${selectedGuest.name} has ${selectedGuest.count} guests.`,
        variant: "destructive"
      });
      return;
    }

    if (section.status !== 'AVAILABLE') {
      toast({
        title: "❌ Section Unavailable",
        description: `${table.name} ${section.section} is not available.`,
        variant: "destructive"
      });
      return;
    }

    // Update section status to ALLOCATED
    setTables(prevTables =>
      prevTables.map(t => {
        if (t.id === table.id) {
          return {
            ...t,
            [section.section]: {
              ...section,
              status: 'ALLOCATED' as const,
              allocatedTo: selectedGuest.name,
              allocatedGuest: selectedGuest,
              allocatedCount: selectedGuest.count,
            }
          };
        }
        return t;
      })
    );

    // Call the parent callback to track allocation
    onTableAllocated(selectedGuest.originalIndex, [table.id]);

    onTableAssign(table.id, selectedGuest.name, selectedGuest.count, selectedGuest.showTime);

    toast({
      title: "📍 Table Section Allocated",
      description: `${selectedGuest.name} (${selectedGuest.count} guests) allocated to ${table.name} ${section.section}. Page when ready!`,
    });

    setShowAssignDialog(false);
    setSelectedGuest(null);
  };

  const moveGuestToSection = (newSectionId: string) => {
    if (!guestToMove) return;

    const newTable = tables.find(t => t.front.id === newSectionId || t.back.id === newSectionId);
    const newSection = newTable?.front.id === newSectionId ? newTable.front : newTable?.back;
    
    if (!newTable || !newSection) return;

    if (guestToMove.count > newSection.capacity) {
      toast({
        title: "❌ Insufficient Capacity",
        description: `${newTable.name} ${newSection.section} can only seat ${newSection.capacity} guests, but ${guestToMove.name} has ${guestToMove.count} guests.`,
        variant: "destructive"
      });
      return;
    }

    if (newSection.status !== 'AVAILABLE') {
      toast({
        title: "❌ Section Unavailable",
        description: `${newTable.name} ${newSection.section} is not available.`,
        variant: "destructive"
      });
      return;
    }

    // Free current section
    const currentTable = tables.find(t => t.front.id === currentSectionId || t.back.id === currentSectionId);
    const currentSection = currentTable?.front.id === currentSectionId ? 'front' : 'back';
    
    setTables(prevTables =>
      prevTables.map(t => {
        if (t.id === currentTable?.id) {
          return {
            ...t,
            [currentSection]: {
              ...t[currentSection],
              status: 'AVAILABLE' as const,
              allocatedTo: undefined,
              allocatedGuest: undefined,
              allocatedCount: undefined,
            }
          };
        }
        if (t.id === newTable.id) {
          return {
            ...t,
            [newSection.section]: {
              ...newSection,
              status: 'ALLOCATED' as const,
              allocatedTo: guestToMove.name,
              allocatedGuest: guestToMove,
              allocatedCount: guestToMove.count,
            }
          };
        }
        return t;
      })
    );

    toast({
      title: "🔄 Guest Moved",
      description: `${guestToMove.name} moved to ${newTable.name} ${newSection.section}`,
    });

    setShowMoveDialog(false);
    setGuestToMove(null);
    setCurrentSectionId('');
  };

  const markGuestSeated = (sectionId: string) => {
    const table = tables.find(t => t.front.id === sectionId || t.back.id === sectionId);
    const section = table?.front.id === sectionId ? table.front : table?.back;
    
    if (!table || !section || !section.allocatedGuest) return;

    // Mark guest as seated
    onGuestSeated(section.allocatedGuest.originalIndex);

    // Update section status to OCCUPIED
    setTables(prevTables =>
      prevTables.map(t => {
        if (t.id === table.id) {
          return {
            ...t,
            [section.section]: { ...section, status: 'OCCUPIED' as const }
          };
        }
        return t;
      })
    );

    toast({
      title: "✅ Guest Seated",
      description: `${section.allocatedGuest.name} has been seated at ${table.name} ${section.section}`,
    });
  };

  const freeSection = (sectionId: string) => {
    const table = tables.find(t => t.front.id === sectionId || t.back.id === sectionId);
    const section = table?.front.id === sectionId ? table.front : table?.back;
    
    if (!table || !section) return;

    setTables(prevTables =>
      prevTables.map(t => {
        if (t.id === table.id) {
          return {
            ...t,
            [section.section]: {
              ...section,
              status: 'AVAILABLE' as const,
              allocatedTo: undefined,
              allocatedGuest: undefined,
              allocatedCount: undefined,
            }
          };
        }
        return t;
      })
    );

    toast({
      title: "🔄 Section Freed",
      description: `${table.name} ${section.section} is now available`,
    });
  };

  const adjustSectionCapacity = (sectionId: string, change: number) => {
    const table = tables.find(t => t.front.id === sectionId || t.back.id === sectionId);
    const sectionType = table?.front.id === sectionId ? 'front' : 'back';
    
    if (!table || !sectionType) return;

    setTables(prevTables =>
      prevTables.map(t => {
        if (t.id === table.id) {
          const section = t[sectionType];
          const newCapacity = Math.max(1, section.capacity + change);
          return {
            ...t,
            [sectionType]: { ...section, capacity: newCapacity }
          };
        }
        return t;
      })
    );

    const action = change > 0 ? 'Added' : 'Removed';
    const seats = Math.abs(change);
    toast({
      title: `🪑 Seats ${action}`,
      description: `${action} ${seats} seat(s) ${change > 0 ? 'to' : 'from'} ${table.name} ${sectionType}`,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return <Badge className="bg-green-600 text-xs">Available</Badge>;
      case 'ALLOCATED': return <Badge className="bg-blue-600 text-xs">Allocated</Badge>;
      case 'OCCUPIED': return <Badge className="bg-red-600 text-xs">Occupied</Badge>;
      default: return <Badge variant="secondary" className="text-xs">Unknown</Badge>;
    }
  };

  // Get all available sections for assignment
  const getAvailableSections = () => {
    const sections: Array<{section: TableSection, tableName: string}> = [];
    tables.forEach(table => {
      if (table.front.status === 'AVAILABLE') {
        sections.push({ section: table.front, tableName: table.name });
      }
      if (table.back.status === 'AVAILABLE') {
        sections.push({ section: table.back, tableName: table.name });
      }
    });
    return sections;
  };

  // Organize tables by the new layout
  const organizeTablesByRows = () => {
    const row1 = tables.filter(t => [1, 2, 3].includes(t.id));
    const row2 = tables.filter(t => [4, 5, 6].includes(t.id));
    const row3 = tables.filter(t => [7, 8, 9].includes(t.id));
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
                  {guest.notes && (
                    <p className="text-xs text-gray-600 mt-2 italic">"{guest.notes}"</p>
                  )}
                  <Button className="w-full mt-3" size="sm">
                    Assign Table
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table Layout - Updated with front/back sections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Utensils className="h-5 w-5" />
            <span>Table Layout (Front/Back Sections)</span>
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
                  {rowName === 'row1' && 'Row 1 (Front) - Each table has front & back sections'}
                  {rowName === 'row2' && 'Row 2 - Each table has front & back sections'}
                  {rowName === 'row3' && 'Row 3 - Each table has front & back sections'}
                  {rowName === 'row4' && 'Row 4 (Back) - Each table has front & back sections'}
                </h4>
                <div className={`grid gap-4 ${rowName === 'row4' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  {rowTables.map((table) => (
                    <div key={table.id} className="border-2 border-gray-300 rounded-lg p-2">
                      <h3 className="font-bold text-center mb-2">{table.name}</h3>
                      
                      {/* Front Section */}
                      <div className={`p-3 mb-2 border rounded-lg ${
                        table.front.status === 'AVAILABLE' ? 'bg-green-100 border-green-300' :
                        table.front.status === 'ALLOCATED' ? 'bg-blue-100 border-blue-300' :
                        'bg-red-100 border-red-300'
                      }`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-sm">Front</span>
                          {getStatusBadge(table.front.status)}
                        </div>
                        
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-600">
                            {table.front.capacity} seats
                          </span>
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => adjustSectionCapacity(table.front.id, -1)}
                              className="h-5 w-5 p-0"
                              disabled={table.front.capacity <= 1}
                            >
                              <Minus className="h-2 w-2" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => adjustSectionCapacity(table.front.id, 1)}
                              className="h-5 w-5 p-0"
                            >
                              <Plus className="h-2 w-2" />
                            </Button>
                          </div>
                        </div>

                        {table.front.allocatedTo && (
                          <div className="mb-2">
                            <p className="font-medium text-xs">{table.front.allocatedTo}</p>
                            <p className="text-xs text-gray-600">{table.front.allocatedCount} guests</p>
                          </div>
                        )}

                        {table.front.status === 'ALLOCATED' && table.front.allocatedGuest && (
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              onClick={() => markGuestSeated(table.front.id)}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-xs py-1"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Seat
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMoveGuest(table.front.allocatedGuest!, table.front.id)}
                              className="flex-1 text-xs py-1"
                            >
                              <ArrowRightLeft className="h-3 w-3 mr-1" />
                              Move
                            </Button>
                          </div>
                        )}

                        {table.front.status === 'OCCUPIED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => freeSection(table.front.id)}
                            className="w-full text-xs py-1"
                          >
                            Free
                          </Button>
                        )}
                      </div>

                      {/* Back Section */}
                      <div className={`p-3 border rounded-lg ${
                        table.back.status === 'AVAILABLE' ? 'bg-green-100 border-green-300' :
                        table.back.status === 'ALLOCATED' ? 'bg-blue-100 border-blue-300' :
                        'bg-red-100 border-red-300'
                      }`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-sm">Back</span>
                          {getStatusBadge(table.back.status)}
                        </div>
                        
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-600">
                            {table.back.capacity} seats
                          </span>
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => adjustSectionCapacity(table.back.id, -1)}
                              className="h-5 w-5 p-0"
                              disabled={table.back.capacity <= 1}
                            >
                              <Minus className="h-2 w-2" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => adjustSectionCapacity(table.back.id, 1)}
                              className="h-5 w-5 p-0"
                            >
                              <Plus className="h-2 w-2" />
                            </Button>
                          </div>
                        </div>

                        {table.back.allocatedTo && (
                          <div className="mb-2">
                            <p className="font-medium text-xs">{table.back.allocatedTo}</p>
                            <p className="text-xs text-gray-600">{table.back.allocatedCount} guests</p>
                          </div>
                        )}

                        {table.back.status === 'ALLOCATED' && table.back.allocatedGuest && (
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              onClick={() => markGuestSeated(table.back.id)}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-xs py-1"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Seat
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMoveGuest(table.back.allocatedGuest!, table.back.id)}
                              className="flex-1 text-xs py-1"
                            >
                              <ArrowRightLeft className="h-3 w-3 mr-1" />
                              Move
                            </Button>
                          </div>
                        )}

                        {table.back.status === 'OCCUPIED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => freeSection(table.back.id)}
                            className="w-full text-xs py-1"
                          >
                            Free
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table Assignment Dialog - Updated for sections */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Assign Table Section for {selectedGuest?.name} ({selectedGuest?.count} guests)
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
              
              {selectedGuest.notes && (
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm text-blue-800"><strong>Notes:</strong> "{selectedGuest.notes}"</p>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="font-medium">Available Table Sections:</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {getAvailableSections().map(({ section, tableName }) => (
                    <Button
                      key={section.id}
                      variant="outline"
                      onClick={() => assignTableSection(section.id)}
                      className="p-4 h-auto flex flex-col"
                      disabled={selectedGuest.count > section.capacity}
                    >
                      <span className="font-bold">{tableName}</span>
                      <span className="text-sm text-gray-600 capitalize">{section.section}</span>
                      <span className="text-sm text-gray-600">
                        {section.capacity} seats
                      </span>
                      {selectedGuest.count > section.capacity && (
                        <span className="text-xs text-red-600">Too small</span>
                      )}
                    </Button>
                  ))}
                </div>

                {getAvailableSections().length === 0 && (
                  <p className="text-red-600 text-center py-4">
                    No available table sections
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Move Guest Dialog - Updated for sections */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Move {guestToMove?.name} ({guestToMove?.count} guests) to New Section
            </DialogTitle>
          </DialogHeader>
          
          {guestToMove && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">{guestToMove.name}</span>
                  <span className="text-gray-600 ml-2">({guestToMove.count} guests)</span>
                </div>
                <Badge variant="outline">{guestToMove.showTime}</Badge>
                {guestToMove.pagerNumber && (
                  <Badge className="bg-purple-100 text-purple-800">
                    Pager #{guestToMove.pagerNumber}
                  </Badge>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Available Table Sections:</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {getAvailableSections().map(({ section, tableName }) => (
                    <Button
                      key={section.id}
                      variant="outline"
                      onClick={() => moveGuestToSection(section.id)}
                      className="p-4 h-auto flex flex-col"
                      disabled={guestToMove.count > section.capacity}
                    >
                      <span className="font-bold">{tableName}</span>
                      <span className="text-sm text-gray-600 capitalize">{section.section}</span>
                      <span className="text-sm text-gray-600">
                        {section.capacity} seats
                      </span>
                      {guestToMove.count > section.capacity && (
                        <span className="text-xs text-red-600">Too small</span>
                      )}
                    </Button>
                  ))}
                </div>

                {getAvailableSections().length === 0 && (
                  <p className="text-red-600 text-center py-4">
                    No available table sections
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
