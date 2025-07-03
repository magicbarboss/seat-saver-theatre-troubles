import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Utensils, CheckCircle, Plus, Minus, ArrowRightLeft, UserPlus } from 'lucide-react';
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
  isWalkIn?: boolean;
}

interface TableAllocationProps {
  onTableAssign: (tableId: number, guestName: string, guestCount: number, showTime: string) => void;
  checkedInGuests: CheckedInGuest[];
  onPagerRelease: (pagerNumber: number) => void;
  onGuestSeated: (guestIndex: number) => void;
  onTableAllocated: (guestIndex: number, tableIds: number[]) => void;
  onAddWalkIn?: (walkInGuest: { name: string; count: number; showTime: string; notes?: string }) => void;
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
  seatedCount?: number; // Track actually seated guests separately
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
  onTableAllocated,
  onAddWalkIn 
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
  const [selectedTableIds, setSelectedTableIds] = useState<number[]>([]);
  const [showWalkInDialog, setShowWalkInDialog] = useState(false);
  const [walkInForm, setWalkInForm] = useState({
    name: '',
    count: 1,
    showTime: '7:00 PM',
    notes: ''
  });

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

  // Update table statuses based on current guest states - FIXED TO PROPERLY SYNC
  useEffect(() => {
    console.log('Syncing table state with guest state');
    setTables(prevTables => 
      prevTables.map(table => ({
        ...table,
        sections: table.sections.map(section => {
          if (section.allocatedGuest) {
            const currentGuest = checkedInGuests.find(g => g.originalIndex === section.allocatedGuest?.originalIndex);
            
            // If guest no longer exists, clear the allocation
            if (!currentGuest) {
              console.log(`Guest no longer exists, clearing section ${section.id}`);
              return {
                ...section,
                status: 'AVAILABLE' as const,
                allocatedTo: undefined,
                allocatedGuest: undefined,
                allocatedCount: undefined,
                seatedCount: undefined,
              };
            }
            
            // Update status based on guest state
            if (currentGuest.hasBeenSeated) {
              return { ...section, status: 'OCCUPIED' as const };
            } else if (!currentGuest.hasTableAllocated) {
              // Guest lost table allocation, clear it
              console.log(`Guest ${currentGuest.name} lost table allocation, clearing section ${section.id}`);
              return {
                ...section,
                status: 'AVAILABLE' as const,
                allocatedTo: undefined,
                allocatedGuest: undefined,
                allocatedCount: undefined,
                seatedCount: undefined,
              };
            }
            
            return section;
          }
          return section;
        })
      }))
    );
  }, [checkedInGuests]);

  // Get guests that can be assigned tables (checked in but not seated)
  const availableForAllocation = checkedInGuests.filter(guest => 
    !guest.hasBeenSeated && !guest.hasTableAllocated
  );

  // Define adjacent table relationships based on physical layout - UPDATED TO INCLUDE VERTICAL ADJACENCY
  const getAdjacentTables = (tableId: number): number[] => {
    const adjacencyMap: Record<number, number[]> = {
      // Row 1 (Front): T1, T2, T3
      1: [2, 4], // T1 adjacent to T2 (horizontal) and T4 (vertical)
      2: [1, 3, 5], // T2 adjacent to T1, T3 (horizontal) and T5 (vertical)
      3: [2, 6], // T3 adjacent to T2 (horizontal) and T6 (vertical)
      // Row 2: T4, T5, T6
      4: [1, 5, 7], // T4 adjacent to T5 (horizontal), T1 (vertical up), T7 (vertical down)
      5: [2, 4, 6, 8], // T5 adjacent to T4, T6 (horizontal), T2 (vertical up), T8 (vertical down)
      6: [3, 5, 9], // T6 adjacent to T5 (horizontal), T3 (vertical up), T9 (vertical down)
      // Row 3: T7, T8, T9
      7: [4, 8, 10], // T7 adjacent to T8 (horizontal), T4 (vertical up), T10 (vertical down)
      8: [5, 7, 9, 11], // T8 adjacent to T7, T9 (horizontal), T5 (vertical up), T11 (vertical down)
      9: [6, 8, 12], // T9 adjacent to T8 (horizontal), T6 (vertical up), T12 (vertical down)
      // Row 4 (Back): T10, T11, T12, T13
      10: [7, 11], // T10 adjacent to T11 (horizontal) and T7 (vertical up)
      11: [8, 10, 12], // T11 adjacent to T10, T12 (horizontal) and T8 (vertical up)
      12: [9, 11, 13], // T12 adjacent to T11, T13 (horizontal) and T9 (vertical up)
      13: [12], // T13 adjacent to T12 (horizontal)
    };
    return adjacencyMap[tableId] || [];
  };

  // Check if tables are adjacent (for combination validation)
  const areTablesAdjacent = (tableIds: number[]): boolean => {
    if (tableIds.length <= 1) return true;
    
    // For each table, check if it's adjacent to at least one other table in the group
    return tableIds.every(tableId => {
      const adjacent = getAdjacentTables(tableId);
      return tableIds.some(otherId => otherId !== tableId && adjacent.includes(otherId));
    });
  };

  // Get available capacity for each section - ENHANCED WITH DEBUG LOGGING
  const getSectionAvailableCapacity = (section: TableSection): number => {
    console.log(`DEBUG getSectionAvailableCapacity: Section ${section.id}, status=${section.status}, capacity=${section.capacity}, allocatedCount=${section.allocatedCount || 0}, seatedCount=${section.seatedCount || 0}`);
    
    if (section.status === 'AVAILABLE') {
      console.log(`Section ${section.id} is AVAILABLE, returning full capacity: ${section.capacity}`);
      return section.capacity;
    }
    if (section.status === 'ALLOCATED') {
      // For allocated sections, available capacity is total capacity minus seated guests
      const seatedGuests = section.seatedCount || 0;
      const available = Math.max(0, section.capacity - seatedGuests);
      console.log(`Section ${section.id} is ALLOCATED, ${seatedGuests} seated, ${available} available out of ${section.capacity} total`);
      return available;
    }
    console.log(`Section ${section.id} is OCCUPIED, returning 0`);
    return 0; // OCCUPIED sections have no available capacity
  };

  // Check if a section can accommodate additional guests - ENHANCED WITH DEBUG LOGGING
  const canSectionAccommodateGuests = (section: TableSection, guestCount: number): boolean => {
    const availableCapacity = getSectionAvailableCapacity(section);
    const canAccommodate = availableCapacity >= guestCount;
    console.log(`DEBUG canSectionAccommodateGuests: Section ${section.id}, availableCapacity=${availableCapacity}, guestCount=${guestCount}, canAccommodate=${canAccommodate}`);
    return canAccommodate;
  };

  // Get tables that can be expanded for single guests
  const getExpandableTablesForSingleGuest = () => {
    if (!selectedGuest || selectedGuest.count !== 1) return [];
    
    // First check if there are any regular seats available
    const regularSeatsAvailable = tables.some(table => 
      table.sections.some(section => {
        const availableCapacity = getSectionAvailableCapacity(section);
        return availableCapacity >= 1;
      })
    );
    
    // If regular seats are available, don't offer expansion options
    if (regularSeatsAvailable) {
      console.log('Regular seats available, not offering expansion options');
      return [];
    }
    
    const expandableOptions: Array<{
      table: Table;
      adjacentTable: Table;
      totalCapacity: number;
      display: string;
    }> = [];

    tables.forEach(table => {
      // Check if this table has any allocated OR occupied sections (existing groups)
      const hasExistingGroup = table.sections.some(s => s.status === 'ALLOCATED' || s.status === 'OCCUPIED');
      
      if (hasExistingGroup) {
        // Find adjacent tables that are completely available
        const adjacentTableIds = getAdjacentTables(table.id);
        
        adjacentTableIds.forEach(adjId => {
          const adjacentTable = tables.find(t => t.id === adjId);
          if (adjacentTable && adjacentTable.sections.every(s => s.status === 'AVAILABLE')) {
            expandableOptions.push({
              table,
              adjacentTable,
              totalCapacity: table.totalCapacity + adjacentTable.totalCapacity,
              display: `Expand ${table.name} with ${adjacentTable.name} (join existing group)`
            });
          }
        });
      }
    });

    return expandableOptions;
  };

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

    console.log(`DEBUG assignTableSection: Starting assignment for section ${sectionId}, guest ${selectedGuest.name}, count ${selectedGuest.count}`);

    const table = tables.find(t => t.sections.some(s => s.id === sectionId));
    const section = table?.sections.find(s => s.id === sectionId);
    
    if (!table || !section) return;

    console.log(`DEBUG assignTableSection: Found table ${table.name}, section ${section.section}, current status ${section.status}, capacity ${section.capacity}, seatedCount ${section.seatedCount || 0}`);

    // Check if section can accommodate the guest count
    if (!canSectionAccommodateGuests(section, selectedGuest.count)) {
      const availableCapacity = getSectionAvailableCapacity(section);
      toast({
        title: "❌ Insufficient Capacity",
        description: `${table.name} ${section.section === 'whole' ? '' : section.section} only has ${availableCapacity} seats available, but ${selectedGuest.name} has ${selectedGuest.count} guests.`,
        variant: "destructive"
      });
      return;
    }

    // Update section - FIXED to properly track allocation vs seating
    setTables(prevTables =>
      prevTables.map(t => {
        if (t.id === table.id) {
          return {
            ...t,
            sections: t.sections.map(s => {
              if (s.id === sectionId) {
                const currentAllocatedCount = s.allocatedCount || 0;
                const newAllocatedCount = currentAllocatedCount + selectedGuest.count;
                
                // For display purposes, concatenate guest names when adding to existing allocation
                const newAllocatedTo = s.allocatedTo ? `${s.allocatedTo}, ${selectedGuest.name}` : selectedGuest.name;
                
                console.log(`AFTER ASSIGNMENT: Section ${sectionId} will have allocatedCount: ${newAllocatedCount}, status: ALLOCATED`);
                
                return {
                  ...s,
                  status: 'ALLOCATED' as const,
                  allocatedTo: newAllocatedTo,
                  allocatedGuest: selectedGuest,
                  allocatedCount: newAllocatedCount,
                  seatedCount: s.seatedCount || 0, // Keep existing seated count
                };
              }
              return s;
            })
          };
        }
        return t;
      })
    );

    // Call the parent callback to track allocation
    onTableAllocated(selectedGuest.originalIndex, [table.id]);

    onTableAssign(table.id, selectedGuest.name, selectedGuest.count, selectedGuest.showTime);

    const sectionDisplay = section.section === 'whole' ? '' : ` ${section.section}`;
    const availableAfter = getSectionAvailableCapacity(section) - selectedGuest.count;
    toast({
      title: "📍 Table Allocated",
      description: `${selectedGuest.name} (${selectedGuest.count} guests) allocated to ${table.name}${sectionDisplay}. ${availableAfter > 0 ? `${availableAfter} seats remaining.` : 'Section full.'} Page when ready!`,
    });

    setShowAssignDialog(false);
    setSelectedGuest(null);
  };

  const moveGuestToSection = (newSectionId: string) => {
    if (!guestToMove) return;

    const newTable = tables.find(t => t.sections.some(s => s.id === newSectionId));
    const newSection = newTable?.sections.find(s => s.id === newSectionId);
    
    if (!newTable || !newSection) return;

    // Check available capacity instead of just status
    const availableCapacity = getSectionAvailableCapacity(newSection);
    
    if (guestToMove.count > availableCapacity) {
      toast({
        title: "❌ Insufficient Capacity",
        description: `${newTable.name} ${newSection.section === 'whole' ? '' : newSection.section} only has ${availableCapacity} seats available, but ${guestToMove.name} has ${guestToMove.count} guests.`,
        variant: "destructive"
      });
      return;
    }

    console.log(`Moving guest ${guestToMove.name} from section ${currentSectionId} to section ${newSectionId}`);

    // Clear ALL sections that have this guest allocated, then allocate to new section
    setTables(prevTables =>
      prevTables.map(t => ({
        ...t,
        sections: t.sections.map(s => {
          // Clear any section that has this guest allocated
          if (s.allocatedGuest?.originalIndex === guestToMove.originalIndex) {
            console.log(`Clearing section ${s.id} for guest ${guestToMove.name}`);
            return {
              ...s,
              status: 'AVAILABLE' as const,
              allocatedTo: undefined,
              allocatedGuest: undefined,
              allocatedCount: undefined,
              seatedCount: undefined,
            };
          }
          // Allocate to new section
          if (s.id === newSectionId) {
            console.log(`Allocating section ${s.id} to guest ${guestToMove.name}`);
            const currentAllocated = s.allocatedCount || 0;
            const newAllocatedCount = currentAllocated + guestToMove.count;
            const newAllocatedTo = s.allocatedTo ? `${s.allocatedTo}, ${guestToMove.name}` : guestToMove.name;
            
            return {
              ...s,
              status: 'ALLOCATED' as const,
              allocatedTo: newAllocatedTo,
              allocatedGuest: guestToMove,
              allocatedCount: newAllocatedCount,
              seatedCount: s.seatedCount || 0,
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

    console.log(`DEBUG markGuestSeated: Section ${sectionId}, allocatedCount=${section.allocatedCount}, seatedCount=${section.seatedCount || 0}, capacity=${section.capacity}`);

    // Mark guest as seated
    onGuestSeated(section.allocatedGuest.originalIndex);

    // FIXED: Properly track seated guests per section
    setTables(prevTables =>
      prevTables.map(t => {
        if (t.id === table.id) {
          return {
            ...t,
            sections: t.sections.map(s => {
              if (s.id === sectionId) {
                // Add the guest count to seated count for this section
                const currentSeatedCount = s.seatedCount || 0;
                const guestCount = s.allocatedGuest?.count || 0;
                const newSeatedCount = currentSeatedCount + guestCount;
                
                // Check if THIS SPECIFIC SECTION is full after seating
                const isSectionFull = newSeatedCount >= s.capacity;
                
                console.log(`DEBUG markGuestSeated: Section ${s.id} seating ${guestCount} guests, newSeatedCount=${newSeatedCount}/${s.capacity}, isSectionFull=${isSectionFull}`);
                
                // Only mark as OCCUPIED if this specific section is full
                const newStatus = isSectionFull ? 'OCCUPIED' as const : 'ALLOCATED' as const;
                
                console.log(`Section ${sectionId}: changing status to ${newStatus}`);
                
                return { 
                  ...s, 
                  status: newStatus,
                  seatedCount: newSeatedCount,
                  // Clear allocation info only if section becomes full
                  ...(isSectionFull ? {
                    allocatedTo: undefined,
                    allocatedGuest: undefined,
                    allocatedCount: undefined,
                  } : {})
                };
              }
              return s;
            })
          };
        }
        return t;
      })
    );

    const sectionDisplay = section.section === 'whole' ? '' : ` ${section.section}`;
    const currentSeated = section.seatedCount || 0;
    const afterSeating = currentSeated + (section.allocatedGuest?.count || 0);
    const remainingSeats = section.capacity - afterSeating;
    
    toast({
      title: "✅ Guest Seated",
      description: `${section.allocatedGuest.name} has been seated at ${table.name}${sectionDisplay}${remainingSeats > 0 ? ` (${remainingSeats} seats still available)` : ' (section full)'}`,
    });
  };

  const freeSection = (sectionId: string) => {
    const table = tables.find(t => t.sections.some(s => s.id === sectionId));
    const section = table?.sections.find(s => s.id === sectionId);
    
    if (!table || !section) return;

    console.log(`Freeing section ${sectionId}`);

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
                seatedCount: undefined,
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

  const getStatusBadge = (status: string, section?: TableSection) => {
    switch (status) {
      case 'AVAILABLE': return <Badge className="bg-green-600 text-xs">Available</Badge>;
      case 'ALLOCATED': 
        if (section && section.allocatedCount && section.allocatedCount < section.capacity) {
          const remaining = section.capacity - section.allocatedCount;
          return <Badge className="bg-yellow-600 text-xs">Partial ({remaining} left)</Badge>;
        }
        return <Badge className="bg-blue-600 text-xs">Allocated</Badge>;
      case 'OCCUPIED': return <Badge className="bg-red-600 text-xs">Occupied</Badge>;
      default: return <Badge variant="secondary" className="text-xs">Unknown</Badge>;
    }
  };

  // Get all available sections and whole table options for assignment - FIXED TO PROPERLY PRIORITIZE PARTIAL CAPACITY
  const getAvailableOptions = () => {
    const options: Array<{
      type: 'section' | 'whole-table' | 'multi-table' | 'expand-adjacent';
      section?: TableSection;
      table?: Table;
      tables?: Table[];
      expandOption?: { table: Table; adjacentTable: Table };
      totalCapacity: number;
      display: string;
      tableIds: number[];
    }> = [];

    tables.forEach(table => {
      // Add individual sections that have available capacity (including partially allocated ones)
      table.sections.forEach(section => {
        const availableCapacity = getSectionAvailableCapacity(section);
        console.log(`Checking section ${section.id}: status=${section.status}, capacity=${section.capacity}, allocatedCount=${section.allocatedCount || 0}, availableCapacity=${availableCapacity}`);
        
        if (availableCapacity > 0) {
          const sectionDisplay = section.section === 'whole' ? 'Table' : `${section.section}`;
          let capacityDisplay = '';
          
          if (section.status === 'ALLOCATED' && section.allocatedCount && section.allocatedCount > 0) {
            capacityDisplay = `${availableCapacity} seats left (${section.allocatedCount} used)`;
          } else {
            capacityDisplay = `${section.capacity} seats`;
          }
          
          options.push({
            type: 'section',
            section,
            table,
            totalCapacity: availableCapacity,
            display: `${table.name} ${sectionDisplay} - ${capacityDisplay}`,
            tableIds: [table.id]
          });
        }
      });

      // For tables with sections, add whole table option ONLY if ALL sections are completely available
      if (table.hasSections && table.sections.every(s => s.status === 'AVAILABLE')) {
        options.push({
          type: 'whole-table',
          table,
          totalCapacity: table.totalCapacity,
          display: `${table.name} Whole Table - ${table.totalCapacity} seats`,
          tableIds: [table.id]
        });
      }
    });

    // For single guests, only add expansion options if NO regular seats are available
    if (selectedGuest && selectedGuest.count === 1) {
      const expandableOptions = getExpandableTablesForSingleGuest();
      expandableOptions.forEach(option => {
        options.push({
          type: 'expand-adjacent',
          expandOption: option,
          totalCapacity: option.totalCapacity,
          display: option.display,
          tableIds: [option.table.id, option.adjacentTable.id]
        });
      });
    }

    // Only add multi-table combinations for large parties if no single tables can accommodate them
    if (selectedGuest && selectedGuest.count > 2) {
      const singleTableCanFit = options.some(option => 
        (option.type === 'section' || option.type === 'whole-table') && 
        option.totalCapacity >= selectedGuest.count
      );
      
      if (!singleTableCanFit) {
        // Get all available whole tables (2-seat and 4-seat) - must be completely available
        const availableWholeTables = tables.filter(table => 
          table.sections.every(s => s.status === 'AVAILABLE')
        );

        // Generate ONLY adjacent combinations
        const generateAdjacentCombinations = (tables: Table[], targetCapacity: number) => {
          const combinations: Array<{tables: Table[], totalCapacity: number}> = [];
          
          // Try combinations of 2 adjacent tables
          for (let i = 0; i < tables.length; i++) {
            const adjacentIds = getAdjacentTables(tables[i].id);
            
            for (let j = 0; j < tables.length; j++) {
              if (i !== j && adjacentIds.includes(tables[j].id)) {
                const combo = [tables[i], tables[j]];
                const capacity = combo.reduce((sum, t) => sum + t.totalCapacity, 0);
                if (capacity >= targetCapacity) {
                  // Check if we already have this combination (in reverse order)
                  const exists = combinations.some(c => 
                    c.tables.length === 2 && 
                    ((c.tables[0].id === tables[i].id && c.tables[1].id === tables[j].id) ||
                     (c.tables[0].id === tables[j].id && c.tables[1].id === tables[i].id))
                  );
                  if (!exists) {
                    combinations.push({ tables: combo, totalCapacity: capacity });
                  }
                }
              }
            }
          }

          return combinations;
        };

        const combinations = generateAdjacentCombinations(availableWholeTables, selectedGuest.count);
        
        combinations.forEach(combo => {
          const tableNames = combo.tables.map(t => t.name).join(' + ');
          options.push({
            type: 'multi-table',
            tables: combo.tables,
            totalCapacity: combo.totalCapacity,
            display: `${tableNames} Combined - ${combo.totalCapacity} seats`,
            tableIds: combo.tables.map(t => t.id)
          });
        });
      }
    }

    // Sort by available capacity, prioritizing exact fits and partial occupancy (existing groups)
    return options.sort((a, b) => {
      if (!selectedGuest) return a.totalCapacity - b.totalCapacity;
      
      // Prioritize exact fits
      const aExactFit = a.totalCapacity === selectedGuest.count;
      const bExactFit = b.totalCapacity === selectedGuest.count;
      
      if (aExactFit && !bExactFit) return -1;
      if (!aExactFit && bExactFit) return 1;
      
      // Then prioritize sections with partial occupancy (more efficient use)
      const aPartial = a.section?.status === 'ALLOCATED';
      const bPartial = b.section?.status === 'ALLOCATED';
      
      if (aPartial && !bPartial) return -1;
      if (!aPartial && bPartial) return 1;
      
      // Finally sort by capacity
      return a.totalCapacity - b.totalCapacity;
    });
  };

  // Handle assignment to whole table (allocate all sections) - FIXED DISTRIBUTION LOGIC
  const assignWholeTable = (table: Table) => {
    if (!selectedGuest) return;

    console.log('=== WHOLE TABLE ASSIGNMENT DEBUG ===');
    console.log('Assigning whole table:', table.name, 'for guest:', selectedGuest.name, 'count:', selectedGuest.count, 'table capacity:', table.totalCapacity);
    console.log('Current table sections state:');
    table.sections.forEach(s => {
      console.log(`  Section ${s.id}: status=${s.status}, capacity=${s.capacity}, allocatedCount=${s.allocatedCount || 0}`);
    });

    if (selectedGuest.count > table.totalCapacity) {
      toast({
        title: "❌ Insufficient Capacity",
        description: `${table.name} can only seat ${table.totalCapacity} guests, but ${selectedGuest.name} has ${selectedGuest.count} guests.`,
        variant: "destructive"
      });
      return;
    }

    // Check if there's enough remaining capacity
    const totalAvailableCapacity = table.sections.reduce((sum, s) => sum + getSectionAvailableCapacity(s), 0);
    console.log(`Total available capacity across all sections: ${totalAvailableCapacity}`);
    
    if (selectedGuest.count > totalAvailableCapacity) {
      toast({
        title: "❌ Insufficient Available Capacity",
        description: `${table.name} only has ${totalAvailableCapacity} seats available, but ${selectedGuest.name} has ${selectedGuest.count} guests.`,
        variant: "destructive"
      });
      return;
    }

    // FIXED: Properly distribute guests across sections
    setTables(prevTables =>
      prevTables.map(t => {
        if (t.id === table.id) {
          let remainingGuests = selectedGuest.count;
          console.log(`Starting distribution of ${remainingGuests} guests`);
          
          return {
            ...t,
            sections: t.sections.map(s => {
              if (remainingGuests <= 0) return s; // No more guests to assign
              
              const currentAllocated = s.allocatedCount || 0;
              const currentSeated = s.seatedCount || 0;
              const availableInThisSection = s.capacity - Math.max(currentAllocated, currentSeated);
              const guestsForThisSection = Math.min(remainingGuests, availableInThisSection);
              
              if (guestsForThisSection > 0) {
                remainingGuests -= guestsForThisSection;
                
                console.log(`Section ${s.id}: currentAllocated=${currentAllocated}, currentSeated=${currentSeated}, available=${availableInThisSection}, adding=${guestsForThisSection}`);
                
                // FIXED: Only allocate the guests assigned to THIS section, not the total
                const newAllocatedCount = currentAllocated + guestsForThisSection;
                const newAllocatedTo = s.allocatedTo ? `${s.allocatedTo}, ${selectedGuest.name}` : selectedGuest.name;
                
                return {
                  ...s,
                  status: 'ALLOCATED' as const,
                  allocatedTo: newAllocatedTo,
                  allocatedGuest: selectedGuest,
                  allocatedCount: newAllocatedCount, // Only the guests for THIS section
                  seatedCount: s.seatedCount || 0, // Keep existing seated count
                };
              }
              
              return s; // Section unchanged
            })
          };
        }
        return t;
      })
    );

    console.log('=== END WHOLE TABLE ASSIGNMENT DEBUG ===');

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

  // Handle multi-table assignment
  const assignMultipleTables = (tablesToAssign: Table[]) => {
    if (!selectedGuest) return;

    const totalCapacity = tablesToAssign.reduce((sum, t) => sum + t.totalCapacity, 0);
    
    if (selectedGuest.count > totalCapacity) {
      toast({
        title: "❌ Insufficient Capacity",
        description: `Combined tables can only seat ${totalCapacity} guests, but ${selectedGuest.name} has ${selectedGuest.count} guests.`,
        variant: "destructive"
      });
      return;
    }

    // Check if all tables are fully available
    const allTablesAvailable = tablesToAssign.every(table => 
      table.sections.every(s => s.status === 'AVAILABLE')
    );

    if (!allTablesAvailable) {
      toast({
        title: "❌ Tables Not Available",
        description: `Some of the selected tables are not fully available.`,
        variant: "destructive"
      });
      return;
    }

    // Allocate all sections of all tables
    setTables(prevTables =>
      prevTables.map(t => {
        if (tablesToAssign.some(assignTable => assignTable.id === t.id)) {
          return {
            ...t,
            sections: t.sections.map(s => ({
              ...s,
              status: 'ALLOCATED' as const,
              allocatedTo: selectedGuest.name,
              allocatedGuest: selectedGuest, // Keep the most recent guest for UI purposes
              allocatedCount: selectedGuest.count,
            }))
          };
        }
        return t;
      })
    );

    // Call the parent callback to track allocation
    onTableAllocated(selectedGuest.originalIndex, tablesToAssign.map(t => t.id));

    // Call onTableAssign for the first table (for compatibility)
    onTableAssign(tablesToAssign[0].id, selectedGuest.name, selectedGuest.count, selectedGuest.showTime);

    const tableNames = tablesToAssign.map(t => t.name).join(' + ');
    toast({
      title: "📍 Multiple Tables Allocated",
      description: `${selectedGuest.name} (${selectedGuest.count} guests) allocated to ${tableNames}. Page when ready!`,
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

  const renderTableOption = (table: Table) => {
    if (!selectedGuest) return null;

    const allSectionsAvailable = table.sections.every(s => s.status === 'AVAILABLE');
    const wholeTableCapacity = table.totalCapacity;
    const canFitGuest = selectedGuest.count <= wholeTableCapacity;
    
    // FIXED: Calculate total available capacity across all sections
    const totalAvailableCapacity = table.sections.reduce((sum, s) => sum + getSectionAvailableCapacity(s), 0);
    const canFitInCombinedSections = selectedGuest.count <= totalAvailableCapacity;

    return (
      <div key={table.id} className="border-2 border-gray-300 rounded-lg p-2">
        <h3 className="font-bold text-center mb-2 text-sm">
          {table.name} ({table.totalCapacity} seats)
        </h3>
        
        {/* Whole table option - Show if ALL sections are available OR if combined sections have enough capacity */}
        {(allSectionsAvailable || canFitInCombinedSections) && (
          <Button
            variant="outline"
            onClick={() => assignWholeTable(table)}
            className={`w-full mb-2 text-xs py-1 ${canFitInCombinedSections ? 'border-green-500 bg-green-50 hover:bg-green-100' : 'border-gray-300 opacity-50'}`}
            disabled={!canFitInCombinedSections}
          >
            <span className="font-medium">
              {allSectionsAvailable ? 'Whole Table' : `Distribute Across Sections (${totalAvailableCapacity} available)`}
            </span>
            {!canFitInCombinedSections && <span className="ml-1 text-red-600">(Too small)</span>}
          </Button>
        )}

        {/* Individual sections - SHOW ALL SECTIONS WITH AVAILABLE CAPACITY INCLUDING PARTIAL */}
        {table.sections.map(section => {
          const availableCapacity = getSectionAvailableCapacity(section);
          const sectionCanFit = selectedGuest.count <= availableCapacity;
          const sectionDisplay = section.section === 'whole' ? 'Table' : `${section.section}`;
          
          // Show section if it has any available capacity
          if (availableCapacity > 0) {
            let displayText = `${sectionDisplay} (${availableCapacity} available`;
            if (section.status === 'ALLOCATED' && section.allocatedCount) {
              displayText += `, ${section.allocatedCount} occupied`;
            }
            displayText += ')';

            return (
              <Button
                key={section.id}
                variant="outline"
                onClick={() => assignTableSection(section.id)}
                className={`w-full mb-1 text-xs py-1 ${
                  sectionCanFit 
                    ? 'border-blue-500 bg-blue-50 hover:bg-blue-100' 
                    : 'border-gray-300 opacity-50'
                }`}
                disabled={!sectionCanFit}
              >
                <span>{displayText}</span>
                {!sectionCanFit && <span className="ml-1 text-red-600">(Need {selectedGuest.count}, only {availableCapacity} free)</span>}
              </Button>
            );
          }
          return null;
        })}
      </div>
    );
  };

  const renderAssignmentLayout = () => {
    const { row1, row2, row3, row4 } = organizeTablesByRows();
    
    return (
      <div className="space-y-6">
        {/* Stage indicator */}
        <div className="text-center py-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg border-2 border-dashed border-purple-300">
          <span className="text-sm font-bold text-purple-700">🎭 STAGE 🎭</span>
        </div>

        {/* Expansion options for single guests - REMOVED BROKEN FUNCTIONALITY */}
        {selectedGuest && selectedGuest.count === 1 && getExpandableTablesForSingleGuest().length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-600">Join Existing Groups (Single Guest)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {getExpandableTablesForSingleGuest().map(option => (
                <div
                  key={`expand-${option.table.id}-${option.adjacentTable.id}`}
                  className="p-3 h-auto flex flex-col border-2 border-orange-300 bg-orange-50 rounded text-center"
                >
                  <span className="font-bold text-center text-sm">{option.display}</span>
                  <span className="text-xs text-gray-600">{option.totalCapacity} total seats</span>
                  <span className="text-xs text-orange-600 mt-1">Feature temporarily disabled</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Row 1 */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-600">Row 1 (Front) - 2-seat tables</h4>
          <div className="grid grid-cols-3 gap-2">
            {row1.map(table => renderTableOption(table))}
          </div>
        </div>

        {/* Row 2 */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-600">Row 2 - 4-seat tables (front & back sections)</h4>
          <div className="grid grid-cols-3 gap-2">
            {row2.map(table => renderTableOption(table))}
          </div>
        </div>

        {/* Row 3 */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-600">Row 3 - 4-seat tables (front & back sections)</h4>
          <div className="grid grid-cols-3 gap-2">
            {row3.map(table => renderTableOption(table))}
          </div>
        </div>

        {/* Row 4 */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-600">Row 4 (Back) - 2-seat tables</h4>
          <div className="grid grid-cols-4 gap-2">
            {row4.map(table => renderTableOption(table))}
          </div>
        </div>

        {/* Multi-table combinations for large parties (ONLY ADJACENT) */}
        {selectedGuest && selectedGuest.count > 4 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-600">Adjacent Table Combinations for Large Parties</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {getAvailableOptions()
                .filter(option => option.type === 'multi-table')
                .map(option => (
                  <Button
                    key={option.tableIds.join('-')}
                    variant="outline"
                    onClick={() => assignMultipleTables(option.tables!)}
                    className="p-3 h-auto flex flex-col border-2 border-blue-300 bg-blue-50 hover:bg-blue-100"
                    disabled={selectedGuest.count > option.totalCapacity}
                  >
                    <span className="font-bold text-center text-sm">{option.display}</span>
                    <span className="text-xs text-gray-600">{option.totalCapacity} total seats</span>
                    {selectedGuest.count > option.totalCapacity && (
                      <span className="text-xs text-red-600">Too small</span>
                    )}
                  </Button>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSection = (section: TableSection, table: Table) => {
    const availableCapacity = getSectionAvailableCapacity(section);
    const seatedCount = section.seatedCount || 0;
    const allocatedCount = section.allocatedCount || 0;
    
    return (
      <div key={section.id} className={`p-3 ${table.hasSections ? 'mb-2' : ''} border rounded-lg ${
        section.status === 'AVAILABLE' ? 'bg-green-100 border-green-300' :
        section.status === 'ALLOCATED' && availableCapacity > 0 ? 'bg-yellow-100 border-yellow-300' :
        section.status === 'ALLOCATED' ? 'bg-blue-100 border-blue-300' :
        'bg-red-100 border-red-300'
      }`}>
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium text-sm">
            {section.section === 'whole' ? 'Table' : section.section}
          </span>
          {getStatusBadge(section.status, section)}
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-600">
            {section.capacity} seats
            {seatedCount > 0 && (
              <span className="text-blue-600"> ({seatedCount} seated)</span>
            )}
            {allocatedCount > 0 && section.status === 'ALLOCATED' && (
              <span className="text-orange-600"> ({allocatedCount} allocated, {availableCapacity} free)</span>
            )}
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
            <p className="text-xs text-gray-600">{section.allocatedCount} guests allocated</p>
            {/* Add pager number display for allocated sections */}
            {section.allocatedGuest?.pagerNumber && (
              <Badge className="bg-purple-100 text-purple-800 text-xs mt-1">
                Pager #{section.allocatedGuest.pagerNumber}
              </Badge>
            )}
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
  };

  const renderMainTableLayout = () => {
    const { row1, row2, row3, row4 } = organizeTablesByRows();
    
    return (
      <div className="space-y-6">
        {/* Stage indicator */}
        <div className="text-center py-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg border-2 border-dashed border-purple-300">
          <span className="text-sm font-bold text-purple-700">🎭 STAGE 🎭</span>
        </div>

        {/* Row 1 */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-600">Row 1 (Front) - 2-seat tables</h4>
          <div className="grid grid-cols-3 gap-2">
            {row1.map(table => (
              <div key={table.id} className="border-2 border-gray-300 rounded-lg p-2">
                <h3 className="font-bold text-center mb-2 text-sm">
                  {table.name} ({table.totalCapacity} seats)
                </h3>
                {table.sections.map(section => renderSection(section, table))}
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-600">Row 2 - 4-seat tables (front & back sections)</h4>
          <div className="grid grid-cols-3 gap-2">
            {row2.map(table => (
              <div key={table.id} className="border-2 border-gray-300 rounded-lg p-2">
                <h3 className="font-bold text-center mb-2 text-sm">
                  {table.name} ({table.totalCapacity} seats)
                </h3>
                {table.sections.map(section => renderSection(section, table))}
              </div>
            ))}
          </div>
        </div>

        {/* Row 3 */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-600">Row 3 - 4-seat tables (front & back sections)</h4>
          <div className="grid grid-cols-3 gap-2">
            {row3.map(table => (
              <div key={table.id} className="border-2 border-gray-300 rounded-lg p-2">
                <h3 className="font-bold text-center mb-2 text-sm">
                  {table.name} ({table.totalCapacity} seats)
                </h3>
                {table.sections.map(section => renderSection(section, table))}
              </div>
            ))}
          </div>
        </div>

        {/* Row 4 */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-600">Row 4 (Back) - 2-seat tables</h4>
          <div className="grid grid-cols-4 gap-2">
            {row4.map(table => (
              <div key={table.id} className="border-2 border-gray-300 rounded-lg p-2">
                <h3 className="font-bold text-center mb-2 text-sm">
                  {table.name} ({table.totalCapacity} seats)
                </h3>
                {table.sections.map(section => renderSection(section, table))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const handleAddWalkIn = () => {
    if (!walkInForm.name.trim()) {
      toast({
        title: "❌ Name Required",
        description: "Please enter a name for the walk-in guest.",
        variant: "destructive"
      });
      return;
    }

    if (walkInForm.count < 1) {
      toast({
        title: "❌ Invalid Guest Count",
        description: "Guest count must be at least 1.",
        variant: "destructive"
      });
      return;
    }

    // Call the parent callback if provided
    if (onAddWalkIn) {
      onAddWalkIn({
        name: walkInForm.name,
        count: walkInForm.count,
        showTime: walkInForm.showTime,
        notes: walkInForm.notes || undefined
      });
    }

    toast({
      title: "🚶 Walk-In Added",
      description: `${walkInForm.name} (${walkInForm.count} guests) added as walk-in for ${walkInForm.showTime}`,
    });

    // Reset form and close dialog
    setWalkInForm({
      name: '',
      count: 1,
      showTime: '7:00 PM',
      notes: ''
    });
    setShowWalkInDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Guests waiting for table allocation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Guests Awaiting Table Allocation ({availableForAllocation.length})</span>
            </div>
            <Button
              onClick={() => setShowWalkInDialog(true)}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Walk In
            </Button>
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
                  className={`p-4 border rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors ${
                    guest.isWalkIn ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                  }`}
                  onClick={() => handleGuestSelect(guest)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-gray-900">{guest.name}</h4>
                      {guest.isWalkIn && (
                        <Badge className="bg-green-600 text-white text-xs">
                          Walk-In
                        </Badge>
                      )}
                    </div>
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
          {renderMainTableLayout()}
        </CardContent>
      </Card>

      {/* Table Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
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

              {renderAssignmentLayout()}
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
                  {getAvailableOptions()
                    .filter(option => option.type !== 'section' || option.section!.id !== currentSectionId)
                    .map((option) => (
                      <Button
                        key={option.type === 'section' ? option.section!.id : `whole-${option.table!.id}`}
                        variant="outline"
                        onClick={() => {
                          if (option.type === 'section') {
                            moveGuestToSection(option.section!.id);
                          } else {
                            // For whole table moves, we'd need to implement this differently
                            // For now, just use the first available section
                            const firstAvailable = option.table!.sections.find(s => s.status === 'AVAILABLE');
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

      {/* Walk-In Dialog */}
      <Dialog open={showWalkInDialog} onOpenChange={setShowWalkInDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Walk-In Guest</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="walkInName">Guest Name</Label>
              <Input
                id="walkInName"
                value={walkInForm.name}
                onChange={(e) => setWalkInForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter guest name"
              />
            </div>

            <div>
              <Label htmlFor="walkInCount">Number of Guests</Label>
              <Input
                id="walkInCount"
                type="number"
                min="1"
                max="12"
                value={walkInForm.count}
                onChange={(e) => setWalkInForm(prev => ({ ...prev, count: parseInt(e.target.value) || 1 }))}
              />
            </div>

            <div>
              <Label htmlFor="walkInShowTime">Show Time</Label>
              <select
                id="walkInShowTime"
                value={walkInForm.showTime}
                onChange={(e) => setWalkInForm(prev => ({ ...prev, showTime: e.target.value }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="7:00 PM">7:00 PM</option>
                <option value="8:00 PM">8:00 PM</option>
                <option value="9:00 PM">9:00 PM</option>
                <option value="10:00 PM">10:00 PM</option>
              </select>
            </div>

            <div>
              <Label htmlFor="walkInNotes">Notes (Optional)</Label>
              <Input
                id="walkInNotes"
                value={walkInForm.notes}
                onChange={(e) => setWalkInForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any special requests or notes"
              />
            </div>

            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowWalkInDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddWalkIn}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Add Walk-In
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TableAllocation;
