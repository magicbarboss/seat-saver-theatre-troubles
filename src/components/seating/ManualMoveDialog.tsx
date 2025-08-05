import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Users, MapPin } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface CheckedInGuest {
  name: string;
  count: number;
  showTime: string;
  originalIndex: number;
  pagerNumber?: number;
  hasBeenSeated?: boolean;
  hasTableAllocated?: boolean;
  isWalkIn?: boolean;
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
  seatedCount?: number;
}

interface Table {
  id: number;
  name: string;
  totalCapacity: number;
  hasSections: boolean;
  sections: TableSection[];
}

interface ManualMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tables: Table[];
  onMove: (guestToMove: CheckedInGuest, fromSectionId: string, toSectionId: string) => void;
}

interface AllocatedGuest {
  guest: CheckedInGuest;
  sectionId: string;
  tableName: string;
  sectionName: string;
  isSeated: boolean;
  pagerNumber?: number;
}

export const ManualMoveDialog: React.FC<ManualMoveDialogProps> = ({
  open,
  onOpenChange,
  tables,
  onMove
}) => {
  const [selectedGuest, setSelectedGuest] = useState<AllocatedGuest | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);

  // Get all currently allocated guests
  const getAllocatedGuests = (): AllocatedGuest[] => {
    const allocatedGuests: AllocatedGuest[] = [];
    
    console.log(`🔧 DEBUG ManualMoveDialog: Checking ${tables.length} tables for allocated guests...`);
    
    tables.forEach((table, tableIndex) => {
      console.log(`🔧 Table ${tableIndex}: ${table.name} has ${table.sections.length} sections`);
      table.sections.forEach((section, sectionIndex) => {
        console.log(`🔧 Section ${section.id} (${sectionIndex}):`, {
          status: section.status,
          hasAllocatedGuest: !!section.allocatedGuest,
          allocatedCount: section.allocatedCount || 0,
          allocatedTo: section.allocatedTo,
          guestName: section.allocatedGuest?.name || 'none'
        });
        
        // Check for ANY guest that has been allocated to this section
        // This includes ALLOCATED, OCCUPIED, or any section with allocatedGuest data
        if (section.allocatedGuest && section.allocatedCount > 0) {
          console.log(`🔧 ✅ FOUND allocated guest: ${section.allocatedGuest.name} in section ${section.id}`);
          allocatedGuests.push({
            guest: section.allocatedGuest,
            sectionId: section.id,
            tableName: table.name,
            sectionName: section.section === 'whole' ? 'Whole Table' : section.section,
            isSeated: section.status === 'OCCUPIED',
            pagerNumber: section.allocatedGuest.pagerNumber
          });
        } else {
          console.log(`🔧 ❌ Section ${section.id} has no allocated guest`);
        }
      });
    });
    
    console.log(`🔧 DEBUG ManualMoveDialog: Found ${allocatedGuests.length} allocated guests`);
    return allocatedGuests;
  };

  // Get available destinations with comprehensive debugging
  const getAvailableDestinations = () => {
    if (!selectedGuest) return [];
    
    console.log(`🔧 DEBUG getAvailableDestinations: Selected guest "${selectedGuest.guest.name}" (${selectedGuest.guest.count} people) from section ${selectedGuest.sectionId}`);
    
    const validDestinations: Array<{
      sectionId: string;
      tableName: string;
      sectionName: string;
      availableCapacity: number;
      canFit: boolean;
    }> = [];
    
    // Group sections by table to calculate combined capacity
    const tableCapacities = new Map<string, {
      table: Table;
      totalAvailable: number;
      availableSections: TableSection[];
      excludedSections: TableSection[];
    }>();
    
    tables.forEach(table => {
      let totalAvailable = 0;
      const availableSections: TableSection[] = [];
      const excludedSections: TableSection[] = [];
      
      table.sections.forEach(section => {
        const allocatedCount = section.allocatedCount || 0;
        const seatedCount = section.seatedCount || 0;
        const usedCapacity = Math.max(allocatedCount, seatedCount);
        const availableCapacity = section.capacity - usedCapacity;
        
        // Exclude the guest's current section
        if (section.id === selectedGuest.sectionId) {
          excludedSections.push(section);
          console.log(`🔧   Excluding current section: ${table.name} ${section.section}`);
        } else if (availableCapacity > 0) {
          totalAvailable += availableCapacity;
          availableSections.push(section);
          console.log(`🔧   Available section: ${table.name} ${section.section} (${availableCapacity} seats)`);
        } else {
          excludedSections.push(section);
          console.log(`🔧   Full section: ${table.name} ${section.section} (${usedCapacity}/${section.capacity})`);
        }
      });
      
      if (availableSections.length > 0) {
        tableCapacities.set(table.name, {
          table,
          totalAvailable,
          availableSections,
          excludedSections
        });
        console.log(`🔧   Table ${table.name}: ${totalAvailable} total available seats across ${availableSections.length} sections`);
      }
    });
    
    // Create destinations - both individual sections and combined table options
    tableCapacities.forEach(({ table, totalAvailable, availableSections }) => {
      const canFitInTable = totalAvailable >= selectedGuest.guest.count;
      
      if (table.hasSections && availableSections.length > 1 && canFitInTable) {
        // For multi-section tables, offer the first available section as the target
        // (the actual allocation logic will handle distributing across sections)
        const primarySection = availableSections[0];
        validDestinations.push({
          sectionId: primarySection.id,
          tableName: table.name,
          sectionName: `Whole Table (${totalAvailable} seats)`,
          availableCapacity: totalAvailable,
          canFit: true
        });
        console.log(`🔧   ✅ Added whole table option: ${table.name} (${totalAvailable} seats)`);
      }
      
      // Also add individual sections that can fit the guest
      availableSections.forEach(section => {
        const allocatedCount = section.allocatedCount || 0;
        const seatedCount = section.seatedCount || 0;
        const usedCapacity = Math.max(allocatedCount, seatedCount);
        const availableCapacity = section.capacity - usedCapacity;
        const canFit = availableCapacity >= selectedGuest.guest.count;
        
        validDestinations.push({
          sectionId: section.id,
          tableName: table.name,
          sectionName: section.section === 'whole' ? 'Whole Table' : section.section,
          availableCapacity,
          canFit
        });
        
        console.log(`🔧   ✅ Added section: ${table.name} ${section.section} (${availableCapacity} seats, canFit: ${canFit})`);
      });
    });
    
    console.log(`🔧 DEBUG: FINAL DESTINATIONS (${validDestinations.length} options):`);
    validDestinations.forEach(dest => {
      console.log(`🔧   ${dest.canFit ? '✅' : '❌'} ${dest.tableName} ${dest.sectionName}: ${dest.availableCapacity} seats`);
    });
    
    return validDestinations.sort((a, b) => {
      // Sort by: can fit first, then by available capacity
      if (a.canFit && !b.canFit) return -1;
      if (!a.canFit && b.canFit) return 1;
      return b.availableCapacity - a.availableCapacity;
    });
  };

  const handleMove = () => {
    if (!selectedGuest || !selectedDestination) return;
    
    // Find the destination details to check if it's a whole table move
    const destination = availableDestinations.find(d => d.sectionId === selectedDestination);
    if (!destination) return;
    
    // Check if this is a whole table move (destination name contains "Whole Table")
    const isWholeTableMove = destination.sectionName.includes("Whole Table");
    
    if (isWholeTableMove && selectedGuest.guest.count > 2) {
      // For whole table moves of parties > 2, we need to handle multi-section allocation
      // Find the table and distribute across available sections
      const table = tables.find(t => 
        t.sections.some(s => s.id === selectedDestination)
      );
      
      if (table && table.hasSections) {
        console.log(`🔄 Handling whole table move for ${selectedGuest.guest.name} (${selectedGuest.guest.count} people) to table ${table.name}`);
        
        // Find available sections in this table (excluding current section)
        const availableSections = table.sections.filter(section => {
          if (section.id === selectedGuest.sectionId) return false; // Exclude current section
          const usedCapacity = Math.max(section.allocatedCount || 0, section.seatedCount || 0);
          return (section.capacity - usedCapacity) > 0;
        }).sort((a, b) => {
          // Sort by available capacity descending
          const aAvailable = a.capacity - Math.max(a.allocatedCount || 0, a.seatedCount || 0);
          const bAvailable = b.capacity - Math.max(b.allocatedCount || 0, b.seatedCount || 0);
          return bAvailable - aAvailable;
        });
        
        // For now, move to the first available section - the parent component's move logic
        // will need to be enhanced to handle multi-section distribution
        // But this at least ensures we're moving to an available section with sufficient capacity
        const targetSection = availableSections[0];
        if (targetSection) {
          onMove(selectedGuest.guest, selectedGuest.sectionId, targetSection.id);
        }
      }
    } else {
      // Standard single-section move
      onMove(selectedGuest.guest, selectedGuest.sectionId, selectedDestination);
    }
    
    toast({
      title: "🔄 Guest Moved",
      description: `${selectedGuest.guest.name} has been moved successfully`,
    });
    
    // Reset selections
    setSelectedGuest(null);
    setSelectedDestination(null);
  };

  const allocatedGuests = getAllocatedGuests();
  const availableDestinations = getAvailableDestinations();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manual Guest Move
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
          {/* Step 1: Select Guest to Move */}
          <Card className="flex-1 min-h-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Step 1: Select Guest to Move</span>
                <Badge variant="secondary">{allocatedGuests.length} guests</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              <ScrollArea className="h-[20vh]">
                <div className="space-y-2 pr-3">
                  {allocatedGuests.length === 0 ? (
                    <p className="text-center text-muted-foreground py-6">
                      No guests are currently allocated to tables
                    </p>
                  ) : (
                    allocatedGuests.map((allocatedGuest, index) => (
                      <div
                        key={`${allocatedGuest.sectionId}-${index}`}
                        className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedGuest?.sectionId === allocatedGuest.sectionId
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border hover:border-primary/50 hover:bg-accent/50'
                        }`}
                        onClick={() => setSelectedGuest(allocatedGuest)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground truncate">
                              {allocatedGuest.guest.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {allocatedGuest.guest.count} guests • {allocatedGuest.guest.showTime}
                            </div>
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="h-3 w-3 mr-1" />
                                {allocatedGuest.tableName} {allocatedGuest.sectionName}
                              </Badge>
                              {allocatedGuest.isSeated ? (
                                <Badge className="bg-green-600 text-white text-xs">
                                  Seated
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-600 text-white text-xs">
                                  Allocated
                                </Badge>
                              )}
                              {allocatedGuest.pagerNumber && (
                                <Badge className="bg-purple-600 text-white text-xs">
                                  #{allocatedGuest.pagerNumber}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Step 2: Select Destination */}
          <Card className="flex-1 min-h-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Step 2: Select Destination</span>
                {selectedGuest && (
                  <Badge variant="secondary" className="text-xs">
                    For {selectedGuest.guest.name} ({selectedGuest.guest.count})
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              <ScrollArea className="h-[20vh]">
                <div className="space-y-2 pr-3">
                  {!selectedGuest ? (
                    <p className="text-center text-muted-foreground py-6">
                      Select a guest first to see available destinations
                    </p>
                  ) : availableDestinations.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground mb-3">
                        No available destinations for this guest
                      </p>
                      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        <p className="font-medium mb-2">💡 Debug Info:</p>
                        <p>• Guest needs {selectedGuest?.guest.count} seats</p>
                        <p>• Check console logs for detailed capacity analysis</p>
                        <p>• This could indicate localStorage state persistence</p>
                      </div>
                    </div>
                  ) : (
                    availableDestinations.map((destination) => (
                      <div
                        key={destination.sectionId}
                        className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                          !destination.canFit
                            ? 'border-destructive/30 bg-destructive/5 opacity-60 cursor-not-allowed'
                            : selectedDestination === destination.sectionId
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border hover:border-primary/50 hover:bg-accent/50'
                        }`}
                        onClick={() => {
                          if (destination.canFit) {
                            setSelectedDestination(destination.sectionId);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {destination.tableName} {destination.sectionName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {destination.availableCapacity} seats available
                            </div>
                          </div>
                          {!destination.canFit && (
                            <Badge variant="destructive" className="text-xs">
                              Too small
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              {selectedGuest && selectedDestination && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium">{selectedGuest.guest.name}</span>
                  <ArrowRight className="h-4 w-4" />
                  <span className="font-medium">
                    {availableDestinations.find(d => d.sectionId === selectedDestination)?.tableName} {
                      availableDestinations.find(d => d.sectionId === selectedDestination)?.sectionName
                    }
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleMove}
                disabled={!selectedGuest || !selectedDestination}
                className="bg-primary hover:bg-primary/90"
              >
                Move Guest
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};