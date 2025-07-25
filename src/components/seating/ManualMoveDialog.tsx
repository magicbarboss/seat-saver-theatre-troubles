import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

  // Get available destinations
  const getAvailableDestinations = () => {
    if (!selectedGuest) return [];
    
    const destinations: Array<{
      sectionId: string;
      tableName: string;
      sectionName: string;
      availableCapacity: number;
      canFit: boolean;
    }> = [];
    
    tables.forEach(table => {
      table.sections.forEach(section => {
        // Skip the current section
        if (section.id === selectedGuest.sectionId) return;
        
        const allocatedCount = section.allocatedCount || 0;
        const seatedCount = section.seatedCount || 0;
        const usedCapacity = Math.max(allocatedCount, seatedCount);
        const availableCapacity = section.capacity - usedCapacity;
        
        if (availableCapacity > 0) {
          destinations.push({
            sectionId: section.id,
            tableName: table.name,
            sectionName: section.section === 'whole' ? 'Whole Table' : section.section,
            availableCapacity,
            canFit: availableCapacity >= selectedGuest.guest.count
          });
        }
      });
    });
    
    return destinations.sort((a, b) => {
      // Sort by: can fit first, then by available capacity
      if (a.canFit && !b.canFit) return -1;
      if (!a.canFit && b.canFit) return 1;
      return b.availableCapacity - a.availableCapacity;
    });
  };

  const handleMove = () => {
    if (!selectedGuest || !selectedDestination) return;
    
    onMove(selectedGuest.guest, selectedGuest.sectionId, selectedDestination);
    
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manual Guest Move
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[70vh]">
          {/* Step 1: Select Guest to Move */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Step 1: Select Guest to Move
                <Badge variant="secondary" className="ml-2">{allocatedGuests.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[50vh]">
                <div className="space-y-3">
                  {allocatedGuests.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No guests are currently allocated to tables
                    </p>
                  ) : (
                    allocatedGuests.map((allocatedGuest, index) => (
                      <div
                        key={`${allocatedGuest.sectionId}-${index}`}
                        className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedGuest?.sectionId === allocatedGuest.sectionId
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/50 hover:bg-accent/50'
                        }`}
                        onClick={() => setSelectedGuest(allocatedGuest)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-foreground">
                              {allocatedGuest.guest.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {allocatedGuest.guest.count} guests • {allocatedGuest.guest.showTime}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
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
                                  Pager #{allocatedGuest.pagerNumber}
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Step 2: Select Destination
                {selectedGuest && (
                  <Badge variant="secondary" className="ml-2">
                    For {selectedGuest.guest.name} ({selectedGuest.guest.count} guests)
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[50vh]">
                <div className="space-y-3">
                  {!selectedGuest ? (
                    <p className="text-center text-muted-foreground py-8">
                      Select a guest first to see available destinations
                    </p>
                  ) : availableDestinations.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No available destinations for this guest
                    </p>
                  ) : (
                    availableDestinations.map((destination) => (
                      <div
                        key={destination.sectionId}
                        className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                          !destination.canFit
                            ? 'border-destructive/30 bg-destructive/5 opacity-60 cursor-not-allowed'
                            : selectedDestination === destination.sectionId
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
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
                            <div className="font-semibold">
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

        {/* Move Action */}
        <div className="flex items-center justify-between pt-4 border-t">
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
      </DialogContent>
    </Dialog>
  );
};