import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Clock, MapPin, AlertCircle } from 'lucide-react';
import { CheckedInGuest } from '../checkin/types';
import { FriendshipGroup } from './FriendshipGroup';

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
}

export const SeatingChart: React.FC<SeatingChartProps> = ({
  tables,
  checkedInGuests,
  onTableAssign,
  onGuestMove,
  onTableClear,
  friendshipGroups
}) => {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  // Calculate table statistics
  const tableStats = useMemo(() => {
    const totalTables = tables.length;
    const occupiedTables = tables.filter(t => t.status === 'occupied').length;
    const availableTables = tables.filter(t => t.status === 'available').length;
    const totalSeats = tables.reduce((sum, t) => sum + t.seats, 0);
    const occupiedSeats = tables.reduce((sum, t) => 
      sum + (t.assignedGuests?.reduce((guestSum, g) => guestSum + g.count, 0) || 0), 0
    );

    return {
      totalTables,
      occupiedTables,
      availableTables,
      totalSeats,
      occupiedSeats,
      occupancyRate: totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0
    };
  }, [tables]);

  // Get unassigned guests and group them by friendship
  const { friendshipGroupsData, individualGuests } = useMemo(() => {
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
    const guestLookup = new Map();
    unassignedGuests.forEach(guest => {
      guestLookup.set(guest.originalIndex, guest);
    });
    
    // Process friendship groups
    friendshipGroups.forEach((memberIndices, groupId) => {
      const groupMembers = memberIndices
        .map(index => guestLookup.get(index))
        .filter(guest => guest !== undefined);
      
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
    setSelectedTable(table.id);
    if (table.assignedGuests && table.assignedGuests.length === 0) {
      setShowAssignDialog(true);
    }
  };

  const handleGuestAssign = (guest: CheckedInGuest) => {
    if (!selectedTable) return;
    
    onTableAssign(selectedTable, guest);
    setShowAssignDialog(false);
    setSelectedTable(null);
  };

  const selectedTableData = tables.find(t => t.id === selectedTable);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Total Tables</p>
                <p className="text-2xl font-bold">{tableStats.totalTables}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-success" />
              <div>
                <p className="text-sm font-medium">Available</p>
                <p className="text-2xl font-bold text-success">{tableStats.availableTables}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-warning" />
              <div>
                <p className="text-sm font-medium">Occupied</p>
                <p className="text-2xl font-bold text-warning">{tableStats.occupiedTables}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-info" />
              <div>
                <p className="text-sm font-medium">Occupancy</p>
                <p className="text-2xl font-bold text-info">{tableStats.occupancyRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seating Chart */}
      <div className="flex gap-6">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Seating Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative border border-border rounded-lg bg-background min-h-[400px] overflow-hidden">
              {tables.map(table => {
                const guestCount = table.assignedGuests?.reduce((sum, g) => sum + g.count, 0) || 0;
                
                return (
                  <div
                    key={table.id}
                    className={`absolute border-2 flex items-center justify-center text-sm font-medium cursor-pointer transition-all duration-200 ${
                      getTableStatusColor(table)
                    } ${
                      selectedTable === table.id 
                        ? 'ring-2 ring-primary ring-offset-2 scale-105' 
                        : 'hover:scale-102'
                    } ${
                      table.shape === 'circle' ? 'rounded-full' : 'rounded-lg'
                    }`}
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

        {/* Unassigned Guests Panel */}
        <Card className="w-80">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Guests awaiting allocation
              <Badge variant="secondary">
                {Array.from(friendshipGroupsData.values()).reduce((sum, members) => sum + members.length, 0) + individualGuests.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {/* Friendship Groups */}
              {Array.from(friendshipGroupsData.entries()).map(([groupId, members]) => (
                <FriendshipGroup
                  key={groupId}
                  id={groupId}
                  members={members}
                  onGroupAssign={(groupMembers) => {
                    if (!selectedTable) return;
                    groupMembers.forEach(guest => {
                      handleGuestAssign(guest);
                    });
                  }}
                  isSelected={false}
                />
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
                </div>
              ))}
              
              {friendshipGroupsData.size === 0 && individualGuests.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  All guests have been assigned to tables
                </div>
              )}
            </div>
          </ScrollArea>
          </CardContent>
        </Card>
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
                    <div className="text-left">
                      <div className="font-medium">{members[0]?.name || 'Group'} & Friends</div>
                      <div className="text-sm text-muted-foreground">
                        {members.reduce((sum, m) => sum + m.count, 0)} guests total • Group of {members.length}
                      </div>
                    </div>
                  </Button>
                ))}
                
                {/* Individual Guests in Dialog */}
                {individualGuests.map(guest => (
                  <Button
                    key={guest.originalIndex}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleGuestAssign(guest)}
                  >
                    <div className="text-left">
                      <div className="font-medium">{guest.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {guest.count} guests • {guest.showTime}
                      </div>
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
                    <div>
                      <div className="font-medium">{guest.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {guest.count} guests • {guest.showTime}
                      </div>
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