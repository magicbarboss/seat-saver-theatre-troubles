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
  section: 'front' | 'back' | 'whole';
  capacity: number;
  status: 'AVAILABLE' | 'ALLOCATED' | 'OCCUPIED';
  allocatedTo?: string;
  allocatedGuest?: CheckedInGuest;
  allocatedCount?: number;
}

interface Table {
  id: number;
  name: string;
  sections: TableSection[];
  totalCapacity: number;
  hasSections: boolean; // true for front/back tables, false for whole tables
}

const TableAllocation = ({ 
  onTableAssign, 
  checkedInGuests, 
  onPagerRelease, 
  onGuestSeated,
  onTableAllocated 
}: TableAllocationProps) => {
  const [tables, setTables] = useState<Table[]>([
    // Row 1 (Front) - T1, T2, T3 - 2 seats each (whole tables)
    { 
      id: 1, 
      name: 'T1',
      totalCapacity: 2,
      hasSections: false,
      sections: [{ id: '1-whole', tableId: 1, section: 'whole', capacity: 2, status: 'AVAILABLE' }]
    },
    { 
      id: 2, 
      name: 'T2',
      totalCapacity: 2,
      hasSections: false,
      sections: [{ id: '2-whole', tableId: 2, section: 'whole', capacity: 2, status: 'AVAILABLE' }]
    },
    { 
      id: 3, 
      name: 'T3',
      totalCapacity: 2,
      hasSections: false,
      sections: [{ id: '3-whole', tableId: 3, section: 'whole', capacity: 2, status: 'AVAILABLE' }]
    },
    // Row 2 - T4, T5, T6 - 4 seats each (2 front, 2 back)
    { 
      id: 4, 
      name: 'T4',
      totalCapacity: 4,
      hasSections: true,
      sections: [
        { id: '4-front', tableId: 4, section: 'front', capacity: 2, status: 'AVAILABLE' },
        { id: '4-back', tableId: 4, section: 'back', capacity: 2, status: 'AVAILABLE' }
      ]
    },
    { 
      id: 5, 
      name: 'T5',
      totalCapacity: 4,
      hasSections: true,
      sections: [
        { id: '5-front', tableId: 5, section: 'front', capacity: 2, status: 'AVAILABLE' },
        { id: '5-back', tableId: 5, section: 'back', capacity: 2, status: 'AVAILABLE' }
      ]
    },
    { 
      id: 6, 
      name: 'T6',
      totalCapacity: 4,
      hasSections: true,
      sections: [
        { id: '6-front', tableId: 6, section: 'front', capacity: 2, status: 'AVAILABLE' },
        { id: '6-back', tableId: 6, section: 'back', capacity: 2, status: 'AVAILABLE' }
      ]
    },
    // Row 3 - T7, T8, T9 - 4 seats each (2 front, 2 back)
    { 
      id: 7, 
      name: 'T7',
      totalCapacity: 4,
      hasSections: true,
      sections: [
        { id: '7-front', tableId: 7, section: 'front', capacity: 2, status: 'AVAILABLE' },
        { id: '7-back', tableId: 7, section: 'back', capacity: 2, status: 'AVAILABLE' }
      ]
    },
    { 
      id: 8, 
      name: 'T8',
      totalCapacity: 4,
      hasSections: true,
      sections: [
        { id: '8-front', tableId: 8, section: 'front', capacity: 2, status: 'AVAILABLE' },
        { id: '8-back', tableId: 8, section: 'back', capacity: 2, status: 'AVAILABLE' }
      ]
    },
    { 
      id: 9, 
      name: 'T9',
      totalCapacity: 4,
      hasSections: true,
      sections: [
        { id: '9-front', tableId: 9, section: 'front', capacity: 2, status: 'AVAILABLE' },
        { id: '9-back', tableId: 9, section: 'back', capacity: 2, status: 'AVAILABLE' }
      ]
    },
    // Row 4 (Back) - T10, T11, T12, T13 - 2 seats each (whole tables)
    { 
      id: 10, 
      name: 'T10',
      totalCapacity: 2,
      hasSections: false,
      sections: [{ id: '10-whole', tableId: 10, section: 'whole', capacity: 2, status: 'AVAILABLE' }]
    },
    { 
      id: 11, 
      name: 'T11',
      totalCapacity: 2,
      hasSections: false,
      sections: [{ id: '11-whole', tableId: 11, section: 'whole', capacity: 2, status: 'AVAILABLE' }]
    },
    { 
      id: 12, 
      name: 'T12',
      totalCapacity: 2,
      hasSections: false,
      sections: [{ id: '12-whole', tableId: 12, section: 'whole', capacity: 2, status: 'AVAILABLE' }]
    },
    { 
      id: 13, 
      name: 'T13',
      totalCapacity: 2,
      hasSections: false,
      sections: [{ id: '13-whole', tableId: 13, section: 'whole', capacity: 2, status: 'AVAILABLE' }]
    },
  ]);

  const [selectedGuest, setSelectedGuest] = useState<CheckedInGuest | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [guestToMove, setGuestToMove] = useState<CheckedInGuest | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [currentSectionId, setCurrentSectionId] = useState<string>('');

  // Load table state from localStorage on mount
  useEffect(() => {
    const savedTables = localStorage.getItem('table-allocation-state-v3');
    if (savedTables) {
      try {
        const parsedTables = JSON.parse(savedTables);
        setTables(parsedTables);
        console.log('Loaded table allocation state v3');
      } catch (error) {
        console.error('Failed to load table allocation state:', error);
      }
    }
  }, []);

  // Save table state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('table-allocation-state-v3', JSON.stringify(tables));
  }, [tables]);

  // Update table statuses based on current guest states
  useEffect(() => {
    setTables(prevTables => 
      prevTables.map(table => ({
        ...table,
        sections: table.sections.map(section => 
          section.allocatedGuest ? {
            ...section,
            status: checkedInGuests.find(g => g.originalIndex === section.allocatedGuest?.originalIndex)?.hasBeenSeated 
              ? 'OCCUPIED' as const 
              : !checkedInGuests.find(g => g.originalIndex === section.allocatedGuest?.originalIndex)
              ? 'AVAILABLE' as const
              : section.status
          } : section
        )
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

    const table = tables.find(t => t.sections.some(s => s.id === sectionId));
    const section = table?.sections.find(s => s.id === sectionId);
    
    if (!table || !section) return;

    if (selectedGuest.count > section.capacity) {
      toast({
        title: "❌ Insufficient Capacity",
        description: `${table.name} ${section.section === 'whole' ? '' : section.section} can only seat ${section.capacity} guests, but ${selectedGuest.name} has ${selectedGuest.count} guests.`,
        variant: "destructive"
      });
      return;
    }

    if (section.status !== 'AVAILABLE') {
      toast({
        title: "❌ Section Unavailable",
        description: `${table.name} ${section.section === 'whole' ? '' : section.section} is not available.`,
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
            sections: t.sections.map(s => 
              s.id === sectionId ? {
                ...s,
                status: 'ALLOCATED' as const,
                allocatedTo: selectedGuest.name,
                allocatedGuest: selectedGuest,
                allocatedCount: selectedGuest.count,
              } : s
            )
          };
        }
        return t;
      })
    );

    // Call the parent callback to track allocation
    onTableAllocated(selectedGuest.originalIndex, [table.id]);

    onTableAssign(table.id, selectedGuest.name, selectedGuest.count, selectedGuest.showTime);

    const sectionDisplay = section.section === 'whole' ? '' : ` ${section.section}`;
    toast({
      title: "📍 Table Allocated",
      description: `${selectedGuest.name} (${selectedGuest.count} guests) allocated to ${table.name}${sectionDisplay}. Page when ready!`,
    });

    setShowAssignDialog(false);
    setSelectedGuest(null);
  };

  const moveGuestToSection = (newSectionId: string) => {
    if (!guestToMove) return;

    const newTable = tables.find(t => t.sections.some(s => s.id === newSectionId));
    const newSection = newTable?.sections.find(s => s.id === newSectionId);
    
    if (!newTable || !newSection) return;

    if (guestToMove.count > newSection.capacity) {
      toast({
        title: "❌ Insufficient Capacity",
        description: `${newTable.name} ${newSection.section === 'whole' ? '' : newSection.section} can only seat ${newSection.capacity} guests, but ${guestToMove.name} has ${guestToMove.count} guests.`,
        variant: "destructive"
      });
      return;
    }

    if (newSection.status !== 'AVAILABLE') {
      toast({
        title: "❌ Section Unavailable",
        description: `${newTable.name} ${newSection.section === 'whole' ? '' : newSection.section} is not available.`,
        variant: "destructive"
      });
      return;
    }

    // Free current section and allocate new section
    setTables(prevTables =>
      prevTables.map(t => ({
        ...t,
        sections: t.sections.map(s => {
          if (s.id === currentSectionId) {
            return {
              ...s,
              status: 'AVAILABLE' as const,
              allocatedTo: undefined,
              allocatedGuest: undefined,
              allocatedCount: undefined,
            };
          }
          if (s.id === newSectionId) {
            return {
              ...s,
              status: 'ALLOCATED' as const,
              allocatedTo: guestToMove.name,
              allocatedGuest: guestToMove,
              allocatedCount: guestToMove.count,
            };
          }
          return s;
        })
      }))
    );

    const sectionDisplay = newSection.section === 'whole' ? '' : ` ${newSection.section}`;
    toast({
      title: "🔄 Guest Moved",
      description: `${guestToMove.name} moved to ${newTable.name}${sectionDisplay}`,
    });

    setShowMoveDialog(false);
    setGuestToMove(null);
    setCurrentSectionId('');
  };

  const markGuestSeated = (sectionId: string) => {
    const table = tables.find(t => t.sections.some(s => s.id === sectionId));
    const section = table?.sections.find(s => s.id === sectionId);
    
    if (!table || !section || !section.allocatedGuest) return;

    // Mark guest as seated
    onGuestSeated(section.allocatedGuest.originalIndex);

    // Update section status to OCCUPIED
    setTables(prevTables =>
      prevTables.map(t => {
        if (t.id === table.id) {
          return {
            ...t,
            sections: t.sections.map(s => 
              s.id === sectionId ? { ...s, status: 'OCCUPIED' as const } : s
            )
          };
        }
        return t;
      })
    );

    const sectionDisplay = section.section === 'whole' ? '' : ` ${section.section}`;
    toast({
      title: "✅ Guest Seated",
      description: `${section.allocatedGuest.name} has been seated at ${table.name}${sectionDisplay}`,
    });
  };

  const freeSection = (sectionId: string) => {
    const table = tables.find(t => t.sections.some(s => s.id === sectionId));
    const section = table?.sections.find(s => s.id === sectionId);
    
    if (!table || !section) return;

    setTables(prevTables =>
      prevTables.map(t => {
        if (t.id === table.id) {
          return {
            ...t,
            sections: t.sections.map(s => 
              s.id === sectionId ? {
                ...s,
                status: 'AVAILABLE' as const,
                allocatedTo: undefined,
                allocatedGuest: undefined,
                allocatedCount: undefined,
              } : s
            )
          };
        }
        return t;
      })
    );

    const sectionDisplay = section.section === 'whole' ? '' : ` ${section.section}`;
    toast({
      title: "🔄 Section Freed",
      description: `${table.name}${sectionDisplay} is now available`,
    });
  };

  const adjustSectionCapacity = (sectionId: string, change: number) => {
    const table = tables.find(t => t.sections.some(s => s.id === sectionId));
    const section = table?.sections.find(s => s.id === sectionId);
    
    if (!table || !section) return;

    setTables(prevTables =>
      prevTables.map(t => {
        if (t.id === table.id) {
          return {
            ...t,
            sections: t.sections.map(s => 
              s.id === sectionId ? {
                ...s,
                capacity: Math.max(1, s.capacity + change)
              } : s
            ),
            totalCapacity: t.sections.reduce((sum, s) => 
              sum + (s.id === sectionId ? Math.max(1, s.capacity + change) : s.capacity), 0
            )
          };
        }
        return t;
      })
    );

    const action = change > 0 ? 'Added' : 'Removed';
    const seats = Math.abs(change);
    const sectionDisplay = section.section === 'whole' ? '' : ` ${section.section}`;
    toast({
      title: `🪑 Seats ${action}`,
      description: `${action} ${seats} seat(s) ${change > 0 ? 'to' : 'from'} ${table.name}${sectionDisplay}`,
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

  // Get all available sections and whole table options for assignment
  const getAvailableOptions = () => {
    const options: Array<{
      type: 'section' | 'whole-table';
      section?: TableSection;
      table: Table;
      totalCapacity: number;
      display: string;
    }> = [];

    tables.forEach(table => {
      // For tables with sections (4-9), add whole table option if all sections are available
      if (table.hasSections && table.sections.every(s => s.status === 'AVAILABLE')) {
        options.push({
          type: 'whole-table',
          table,
          totalCapacity: table.totalCapacity,
          display: `${table.name} Whole Table (${table.totalCapacity} seats)`
        });
      }

      // Add individual available sections
      table.sections.forEach(section => {
        if (section.status === 'AVAILABLE') {
          const sectionDisplay = section.section === 'whole' ? 'Table' : `${section.section} section`;
          options.push({
            type: 'section',
            section,
            table,
            totalCapacity: section.capacity,
            display: `${table.name} ${sectionDisplay} (${section.capacity} seats)`
          });
        }
      });
    });

    return options.sort((a, b) => a.totalCapacity - b.totalCapacity);
  };

  // Handle assignment to whole table (allocate all sections)
  const assignWholeTable = (table: Table) => {
    if (!selectedGuest) return;

    console.log('Assigning whole table:', table.name, 'for guest:', selectedGuest.name, 'count:', selectedGuest.count, 'table capacity:', table.totalCapacity);

    if (selectedGuest.count > table.totalCapacity) {
      toast({
        title: "❌ Insufficient Capacity",
        description: `${table.name} can only seat ${table.totalCapacity} guests, but ${selectedGuest.name} has ${selectedGuest.count} guests.`,
        variant: "destructive"
      });
      return;
    }

    // Check if all sections are available
    const allSectionsAvailable = table.sections.every(s => s.status === 'AVAILABLE');
    if (!allSectionsAvailable) {
      toast({
        title: "❌ Table Not Available",
        description: `${table.name} is not fully available for whole table allocation.`,
        variant: "destructive"
      });
      return;
    }

    // Allocate all sections of the table
    setTables(prevTables =>
      prevTables.map(t => {
        if (t.id === table.id) {
          return {
            ...t,
            sections: t.sections.map(s => ({
              ...s,
              status: 'ALLOCATED' as const,
              allocatedTo: selectedGuest.name,
              allocatedGuest: selectedGuest,
              allocatedCount: selectedGuest.count,
            }))
          };
        }
        return t;
      })
    );

    // Call the parent callback to track allocation
    onTableAllocated(selectedGuest.originalIndex, [table.id]);

    onTableAssign(table.id, selectedGuest.name, selectedGuest.count, selectedGuest.showTime);

    toast({
      title: "📍 Whole Table Allocated",
      description: `${selectedGuest.name} (${selectedGuest.count} guests) allocated to entire ${table.name}. Page when ready!`,
    });

    setShowAssignDialog(false);
    setSelectedGuest(null);
  };

  // Organize tables by the layout
  const organizeTablesByRows = () => {
    const row1 = tables.filter(t => [1, 2, 3].includes(t.id));
    const row2 = tables.filter(t => [4, 5, 6].includes(t.id));
    const row3 = tables.filter(t => [7, 8, 9].includes(t.id));
    const row4 = tables.filter(t => [10, 11, 12, 13].includes(t.id));

    return { row1, row2, row3, row4 };
  };

  const renderSection = (section: TableSection, table: Table) => (
    <div key={section.id} className={`p-3 ${table.hasSections ? 'mb-2' : ''} border rounded-lg ${
      section.status === 'AVAILABLE' ? 'bg-green-100 border-green-300' :
      section.status === 'ALLOCATED' ? 'bg-blue-100 border-blue-300' :
      'bg-red-100 border-red-300'
    }`}>
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-sm">
          {section.section === 'whole' ? 'Table' : section.section}
        </span>
        {getStatusBadge(section.status)}
      </div>
      
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-600">
          {section.capacity} seats
        </span>
        <div className="flex items-center space-x-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => adjustSectionCapacity(section.id, -1)}
            className="h-5 w-5 p-0"
            disabled={section.capacity <= 1}
          >
            <Minus className="h-2 w-2" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => adjustSectionCapacity(section.id, 1)}
            className="h-5 w-5 p-0"
          >
            <Plus className="h-2 w-2" />
          </Button>
        </div>
      </div>

      {section.allocatedTo && (
        <div className="mb-2">
          <p className="font-medium text-xs">{section.allocatedTo}</p>
          <p className="text-xs text-gray-600">{section.allocatedCount} guests</p>
        </div>
      )}

      {section.status === 'ALLOCATED' && section.allocatedGuest && (
        <div className="flex space-x-1">
          <Button
            size="sm"
            onClick={() => markGuestSeated(section.id)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-xs py-1"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Seat
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleMoveGuest(section.allocatedGuest!, section.id)}
            className="flex-1 text-xs py-1"
          >
            <ArrowRightLeft className="h-3 w-3 mr-1" />
            Move
          </Button>
        </div>
      )}

      {section.status === 'OCCUPIED' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => freeSection(section.id)}
          className="w-full text-xs py-1"
        >
          Free
        </Button>
      )}
    </div>
  );

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

      {/* Table Layout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Utensils className="h-5 w-5" />
            <span>Table Layout</span>
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
                  {rowName === 'row1' && 'Row 1 (Front) - 2-seat tables'}
                  {rowName === 'row2' && 'Row 2 - 4-seat tables (front & back sections)'}
                  {rowName === 'row3' && 'Row 3 - 4-seat tables (front & back sections)'}
                  {rowName === 'row4' && 'Row 4 (Back) - 2-seat tables'}
                </h4>
                <div className={`grid gap-4 ${rowName === 'row4' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  {rowTables.map((table) => (
                    <div key={table.id} className="border-2 border-gray-300 rounded-lg p-2">
                      <h3 className="font-bold text-center mb-2">
                        {table.name} ({table.totalCapacity} seats)
                      </h3>
                      
                      {/* Render sections */}
                      {table.sections.map(section => renderSection(section, table))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table Assignment Dialog */}
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
              
              {selectedGuest.notes && (
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm text-blue-800"><strong>Notes:</strong> "{selectedGuest.notes}"</p>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="font-medium">Available Tables & Sections:</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {getAvailableOptions().map((option) => {
                    const isDisabled = selectedGuest.count > option.totalCapacity;
                    console.log('Option:', option.display, 'capacity:', option.totalCapacity, 'guest count:', selectedGuest.count, 'disabled:', isDisabled);
                    
                    return (
                      <Button
                        key={option.type === 'section' ? option.section!.id : `whole-${option.table.id}`}
                        variant="outline"
                        onClick={() => {
                          console.log('Button clicked for option:', option.type, option.display);
                          if (option.type === 'section') {
                            assignTableSection(option.section!.id);
                          } else {
                            assignWholeTable(option.table);
                          }
                        }}
                        className="p-4 h-auto flex flex-col"
                        disabled={isDisabled}
                      >
                        <span className="font-bold text-center">{option.display}</span>
                        {isDisabled && (
                          <span className="text-xs text-red-600">Too small</span>
                        )}
                      </Button>
                    );
                  })}
                </div>

                {getAvailableOptions().length === 0 && (
                  <p className="text-red-600 text-center py-4">
                    No available tables or sections
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Move Guest Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Move {guestToMove?.name} ({guestToMove?.count} guests) to New Location
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
                <h4 className="font-medium">Available Tables & Sections:</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {getAvailableOptions().filter(option => 
                    option.type !== 'section' || option.section!.id !== currentSectionId
                  ).map((option) => (
                    <Button
                      key={option.type === 'section' ? option.section!.id : `whole-${option.table.id}`}
                      variant="outline"
                      onClick={() => {
                        if (option.type === 'section') {
                          moveGuestToSection(option.section!.id);
                        } else {
                          // For whole table moves, we'd need to implement this differently
                          // For now, just use the first available section
                          const firstAvailable = option.table.sections.find(s => s.status === 'AVAILABLE');
                          if (firstAvailable) {
                            moveGuestToSection(firstAvailable.id);
                          }
                        }
                      }}
                      className="p-4 h-auto flex flex-col"
                      disabled={guestToMove.count > option.totalCapacity}
                    >
                      <span className="font-bold text-center">{option.display}</span>
                      {guestToMove.count > option.totalCapacity && (
                        <span className="text-xs text-red-600">Too small</span>
                      )}
                    </Button>
                  ))}
                </div>

                {getAvailableOptions().length === 0 && (
                  <p className="text-red-600 text-center py-4">
                    No available tables or sections
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
