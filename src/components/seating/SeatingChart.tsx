import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckedInGuest } from '../checkin/types';
import { WalkInGuestForm } from '../checkin/WalkInGuestForm';
import { formatPizzaName } from '../checkin/PizzaOrderDropdown';
import { Users, UserMinus, Eye, EyeOff, ChevronDown, Link, UserPlus } from 'lucide-react';

interface Table {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  seats: number;
  shape: 'rectangle' | 'circle';
  label: string;
  status: 'available' | 'occupied' | 'reserved' | 'disabled';
  assignedGuests?: CheckedInGuest[];
  currentCapacity?: number;
}

interface SeatingChartProps {
  tables: Table[];
  checkedInGuests: CheckedInGuest[];
  onTableAssign: (tableId: string, guest: CheckedInGuest) => void;
  onGuestMove: (guest: CheckedInGuest, fromTableId: string, toTableId: string) => void;
  onTableClear: (tableId: string) => void;
  friendshipGroups: Map<string, number[]>;
  onAddWalkIn?: (walkInData: { name: string; count: number; showTime: string; notes?: string }) => void;
  showTimes: string[];
}

export const SeatingChart: React.FC<SeatingChartProps> = ({
  tables,
  checkedInGuests,
  onTableAssign,
  onGuestMove,
  onTableClear,
  friendshipGroups,
  onAddWalkIn,
  showTimes = []
}) => {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showGuestPanel, setShowGuestPanel] = useState(true);
  const [isJoinTablesMode, setIsJoinTablesMode] = useState(false);
  const [selectedTablesForJoining, setSelectedTablesForJoining] = useState<string[]>([]);

  // Calculate table statistics
  const tableStats = useMemo(() => {
    const totalTables = tables.length;
    const occupied = tables.filter(t => t.assignedGuests && t.assignedGuests.length > 0).length;
    const available = tables.filter(t => !t.assignedGuests || t.assignedGuests.length === 0).length;
    const totalSeats = tables.reduce((sum, t) => sum + t.seats, 0);
    
    return {
      totalTables,
      occupied,
      available,
      totalSeats
    };
  }, [tables]);

  // Get unassigned guests and group them by friendship
  const { friendshipGroupsData, individualGuests } = useMemo(() => {
    console.log('🔍 SEATING CHART - Friendship groups received:', {
      friendshipGroupsSize: friendshipGroups.size,
      friendshipGroupsData: Array.from(friendshipGroups.entries()),
      checkedInGuestsCount: checkedInGuests.length,
      checkedInGuestNames: checkedInGuests.map(g => `${g.name} (${g.originalIndex})`).slice(0, 10)
    });
    const assignedGuestIds = new Set();
    tables.forEach(table => {
      table.assignedGuests?.forEach(guest => {
        assignedGuestIds.add(guest.originalIndex);
      });
    });
    
    const unassignedGuests = checkedInGuests.filter(guest => !assignedGuestIds.has(guest.originalIndex));
    const groupedGuests = new Map<string, CheckedInGuest[]>();
    const individualGuestsSet = new Set<CheckedInGuest>();
    
    // Build guest lookup by original index
    const guestLookup = new Map<number, CheckedInGuest>();
    unassignedGuests.forEach(guest => {
      guestLookup.set(guest.originalIndex, guest);
    });
    
    // Process friendship groups
    friendshipGroups.forEach((memberIndices, groupId) => {
      const groupMembers = memberIndices
        .map(index => guestLookup.get(index))
        .filter(guest => guest !== undefined) as CheckedInGuest[];
      
      if (groupMembers.length > 1) {
        groupedGuests.set(groupId, groupMembers);
        // Remove grouped guests from individual list
        groupMembers.forEach(guest => individualGuestsSet.delete(guest));
      }
    });
    
    // Add ungrouped guests to individual list
    unassignedGuests.forEach(guest => {
      let isInGroup = false;
      for (const memberIndices of friendshipGroups.values()) {
        if (memberIndices.includes(guest.originalIndex)) {
          isInGroup = true;
          break;
        }
      }
      if (!isInGroup) {
        individualGuestsSet.add(guest);
      }
    });
    
    return {
      friendshipGroupsData: groupedGuests,
      individualGuests: Array.from(individualGuestsSet)
    };
  }, [tables, checkedInGuests, friendshipGroups]);

  const getTableStatusColor = (table: Table) => {
    if (table.assignedGuests && table.assignedGuests.length > 0) {
      const guestCount = table.assignedGuests.reduce((sum, g) => sum + g.count, 0);
      if (guestCount > table.seats) {
        return 'bg-destructive/30 border-destructive text-destructive';
      }
      return 'bg-warning/20 border-warning text-warning-foreground';
    }
    
    switch (table.status) {
      case 'available': return 'bg-success/20 border-success text-success-foreground hover:bg-success/30';
      case 'occupied': return 'bg-warning/20 border-warning text-warning-foreground';
      case 'reserved': return 'bg-info/20 border-info text-info-foreground';
      case 'disabled': return 'bg-muted border-muted-foreground text-muted-foreground';
      default: return 'bg-muted border-border';
    }
  };

  const handleTableClick = (table: Table) => {
    if (isJoinTablesMode) {
      // Handle table selection for joining
      setSelectedTablesForJoining(prev => {
        if (prev.includes(table.id)) {
          return prev.filter(id => id !== table.id);
        } else {
          return [...prev, table.id];
        }
      });
      return;
    }

    setSelectedTable(table);
    if (table.assignedGuests && table.assignedGuests.length > 0) {
      // Show table details dialog if table has guests
      setShowAssignDialog(false);
    } else {
      // Show assignment dialog if table is empty
      setShowAssignDialog(true);
    }
  };

  const handleJoinSelectedTables = () => {
    if (selectedTablesForJoining.length < 2) return;
    
    // Implementation for joining tables would go here
    console.log('Joining tables:', selectedTablesForJoining);
    
    // Reset joining mode
    setIsJoinTablesMode(false);
    setSelectedTablesForJoining([]);
  };

  const cancelJoinTablesMode = () => {
    setIsJoinTablesMode(false);
    setSelectedTablesForJoining([]);
  };

  const handleGuestAssign = (guest: CheckedInGuest) => {
    if (!selectedTable) return;
    
    onTableAssign(selectedTable.id, guest);
    setShowAssignDialog(false);
    setSelectedTable(null);
  };

  const selectedTableData = selectedTable;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Seating Chart</h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{tableStats.totalTables} tables</Badge>
            <Badge variant={tableStats.occupied > 0 ? "default" : "secondary"}>
              {tableStats.occupied} occupied
            </Badge>
            <Badge variant="outline">{tableStats.available} available</Badge>
            <Badge variant="outline">{tableStats.totalSeats} seats</Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onAddWalkIn && showTimes.length > 0 && (
            <WalkInGuestForm 
              showTimes={showTimes}
              onAddWalkIn={onAddWalkIn}
            />
          )}
          
          {isJoinTablesMode ? (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={handleJoinSelectedTables}
                disabled={selectedTablesForJoining.length < 2}
              >
                <Link className="h-4 w-4 mr-2" />
                Join Selected ({selectedTablesForJoining.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelJoinTablesMode}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsJoinTablesMode(true)}
            >
              <Link className="h-4 w-4 mr-2" />
              Join Tables
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGuestPanel(!showGuestPanel)}
            className="flex items-center gap-2"
          >
            {showGuestPanel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showGuestPanel ? 'Hide' : 'Show'} Guests Panel
          </Button>
        </div>
      </div>
      <div className="flex gap-4">
        <Card className="flex-1">
          <CardContent className="p-6">
            <div className="relative border border-border rounded-lg bg-background min-h-[500px] min-w-[450px] overflow-auto">
              {tables.map(table => {
                const guestCount = table.assignedGuests?.reduce((sum, g) => sum + g.count, 0) || 0;
                
                return (
                  <div
                    key={table.id}
                    className={`
                      absolute border-2 rounded-lg cursor-pointer transition-all duration-200
                      flex items-center justify-center text-sm font-medium
                      hover:shadow-lg hover:scale-105 z-10
                      ${getTableStatusColor(table)}
                      ${isJoinTablesMode && selectedTablesForJoining.includes(table.id) 
                        ? 'ring-4 ring-primary ring-opacity-50 border-primary' 
                        : ''}
                      ${isJoinTablesMode ? 'hover:ring-2 hover:ring-primary hover:ring-opacity-30' : ''}
                      ${selectedTable?.id === table.id 
                        ? 'ring-2 ring-primary ring-offset-2 scale-105' 
                        : 'hover:scale-102'}
                      ${table.shape === 'circle' ? 'rounded-full' : 'rounded-lg'}
                    `}
                    style={{
                      left: table.x,
                      top: table.y,
                      width: table.width,
                      height: table.height
                    }}
                    onClick={() => handleTableClick(table)}
                  >
                    <div className="text-center">
                      <div className="font-semibold">{table.label}</div>
                      <div className="text-xs">
                        {guestCount}/{table.seats}
                      </div>
                      {guestCount > table.seats && (
                        <div className="text-xs text-destructive font-bold">Overflow!</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Collapsible Unassigned Guests Panel */}
        {showGuestPanel && (
          <Card className="w-80 animate-slide-in-right">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Guests awaiting allocation
                <Badge variant="secondary">
                  {Array.from(friendshipGroupsData.values()).reduce((sum, members) => sum + members.length, 0) + individualGuests.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] overflow-y-auto">
                <div className="space-y-3">
                  {/* Friendship Groups */}
                  {Array.from(friendshipGroupsData.entries()).map(([groupId, members]) => (
                    <div
                      key={groupId}
                      className="p-3 border border-border rounded-lg bg-card hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => {
                        if (selectedTable) {
                          members.forEach(guest => handleGuestAssign(guest));
                        }
                      }}
                    >
                      <div className="font-medium">{members[0]?.name || 'Group'} & Friends</div>
                      <div className="text-sm text-muted-foreground">
                        {members.reduce((sum, m) => sum + m.count, 0)} guests total • Group of {members.length}
                      </div>
                      {(() => {
                        const allPizzas = members.flatMap(m => m.pizzaSelections || []);
                        const uniquePizzas = Array.from(new Set(allPizzas));
                        return uniquePizzas.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {uniquePizzas.map(pizza => (
                              <Badge key={pizza} variant="secondary" className="text-xs">
                                {formatPizzaName(pizza)}
                              </Badge>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  ))}
                  
                  {/* Individual Guests */}
                  {individualGuests.map(guest => (
                    <div
                      key={guest.originalIndex}
                      className="p-3 border border-border rounded-lg bg-card hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => {
                        if (selectedTable) {
                          handleGuestAssign(guest);
                        }
                      }}
                    >
                      <div className="font-medium">{guest.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {guest.count} guests • {guest.showTime}
                      </div>
                      {guest.isWalkIn && (
                        <Badge variant="outline" className="mt-1">Walk-in</Badge>
                      )}
                      {guest.pizzaSelections && guest.pizzaSelections.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {guest.pizzaSelections.map(pizza => (
                            <Badge key={pizza} variant="secondary" className="text-xs">
                              {formatPizzaName(pizza)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {friendshipGroupsData.size === 0 && individualGuests.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      All guests have been assigned to tables
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Table Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Assign Guest to {selectedTableData?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Table Capacity: {selectedTableData?.seats} seats
            </div>
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {/* Friendship Groups in Dialog */}
                {Array.from(friendshipGroupsData.entries()).map(([groupId, members]) => (
                  <Button
                    key={groupId}
                    variant="outline"
                    className="w-full justify-start h-auto p-3"
                    onClick={() => {
                      members.forEach(guest => handleGuestAssign(guest));
                    }}
                  >
                    <div className="text-left w-full">
                      <div className="font-medium">{members[0]?.name || 'Group'} & Friends</div>
                      <div className="text-sm text-muted-foreground">
                        {members.reduce((sum, m) => sum + m.count, 0)} guests total • Group of {members.length}
                      </div>
                      {(() => {
                        const allPizzas = members.flatMap(m => m.pizzaSelections || []);
                        const uniquePizzas = Array.from(new Set(allPizzas));
                        return uniquePizzas.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {uniquePizzas.map(pizza => (
                              <Badge key={pizza} variant="secondary" className="text-xs">
                                {formatPizzaName(pizza)}
                              </Badge>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </Button>
                ))}
                
                {/* Individual Guests in Dialog */}
                {individualGuests.map(guest => (
                  <Button
                    key={guest.originalIndex}
                    variant="outline"
                    className="w-full justify-start h-auto p-3"
                    onClick={() => handleGuestAssign(guest)}
                  >
                    <div className="text-left w-full">
                      <div className="font-medium">{guest.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {guest.count} guests • {guest.showTime}
                      </div>
                      {guest.pizzaSelections && guest.pizzaSelections.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {guest.pizzaSelections.map(pizza => (
                            <Badge key={pizza} variant="secondary" className="text-xs">
                              {formatPizzaName(pizza)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </Button>
                ))}
                
                {friendshipGroupsData.size === 0 && individualGuests.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    No unassigned guests available
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table Details Dialog */}
      {selectedTableData && selectedTableData.assignedGuests && selectedTableData.assignedGuests.length > 0 && (
        <Dialog open={selectedTable !== null && !showAssignDialog} onOpenChange={() => setSelectedTable(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedTableData.label} Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Capacity:</span>
                <Badge variant="outline">
                  {selectedTableData.assignedGuests.reduce((sum, g) => sum + g.count, 0)} / {selectedTableData.seats}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Assigned Guests:</h4>
                {selectedTableData.assignedGuests.map(guest => (
                  <div key={guest.originalIndex} className="flex items-center justify-between p-2 border border-border rounded">
                    <div className="flex-1">
                      <div className="font-medium">{guest.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {guest.count} guests • {guest.showTime}
                      </div>
                      {guest.pizzaSelections && guest.pizzaSelections.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {guest.pizzaSelections.map(pizza => (
                            <Badge key={pizza} variant="secondary" className="text-xs">
                              {formatPizzaName(pizza)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Move guest back to unassigned
                        onGuestMove(guest, selectedTableData.id, '');
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="destructive"
                  onClick={() => {
                    onTableClear(selectedTableData.id);
                    setSelectedTable(null);
                  }}
                >
                  Clear Table
                </Button>
                <Button variant="outline" onClick={() => setSelectedTable(null)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};