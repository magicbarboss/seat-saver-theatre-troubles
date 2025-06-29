
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Users, Target, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { SmartTableAllocator, detectPartyGroups, TableInfo, GuestGroup, AllocationSuggestion } from '@/utils/smartAllocation';

interface SmartAllocationProps {
  checkedInGuests: any[];
  partyGroups: Map<string, any>;
  onTableAllocated: (guestIndex: number, tableIds: number[]) => void;
  tables?: TableInfo[];
}

const SmartAllocation = ({ 
  checkedInGuests, 
  partyGroups, 
  onTableAllocated,
  tables = []
}: SmartAllocationProps) => {
  const [selectedGuest, setSelectedGuest] = useState<number | null>(null);

  // Default tables if none provided (common restaurant layout)
  const defaultTables: TableInfo[] = [
    { id: 1, capacity: 2, isOccupied: false },
    { id: 2, capacity: 2, isOccupied: false },
    { id: 3, capacity: 4, isOccupied: false },
    { id: 4, capacity: 4, isOccupied: false },
    { id: 5, capacity: 6, isOccupied: false },
    { id: 6, capacity: 6, isOccupied: false },
    { id: 7, capacity: 8, isOccupied: false },
    { id: 8, capacity: 8, isOccupied: false },
    { id: 9, capacity: 10, isOccupied: false },
    { id: 10, capacity: 12, isOccupied: false }
  ];

  const availableTables = tables.length > 0 ? tables : defaultTables;

  // Detect guest groups (parties and individuals)
  const guestGroups = useMemo(() => {
    return detectPartyGroups(
      checkedInGuests.filter(guest => !guest.hasBeenSeated && !guest.hasTableAllocated),
      partyGroups
    );
  }, [checkedInGuests, partyGroups]);

  // Initialize smart allocator
  const allocator = useMemo(() => {
    return new SmartTableAllocator(availableTables, guestGroups);
  }, [availableTables, guestGroups]);

  // Get suggestions for all guest groups
  const allSuggestions = useMemo(() => {
    return guestGroups.map(group => allocator.getSuggestions(group));
  }, [allocator, guestGroups]);

  // Get efficiency badge color
  const getEfficiencyColor = (efficiency: string) => {
    switch (efficiency) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get efficiency icon
  const getEfficiencyIcon = (efficiency: string) => {
    switch (efficiency) {
      case 'excellent': return <CheckCircle className="h-4 w-4" />;
      case 'good': return <Target className="h-4 w-4" />;
      case 'fair': return <AlertCircle className="h-4 w-4" />;
      case 'poor': return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Handle table allocation
  const handleAllocate = (suggestion: AllocationSuggestion, tableIds: number[]) => {
    if (suggestion.guestGroup.isParty && suggestion.guestGroup.partyMembers) {
      // Allocate all party members to the same tables
      suggestion.guestGroup.partyMembers.forEach(memberIndex => {
        onTableAllocated(memberIndex, tableIds);
      });
    } else {
      onTableAllocated(suggestion.guestGroup.guestIndex, tableIds);
    }
  };

  // Get allocation stats
  const stats = allocator.getAllocationStats();

  if (guestGroups.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No guests waiting for table allocation</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Smart Allocation Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">{guestGroups.length}</div>
              <div className="text-sm text-gray-600">Groups Waiting</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalCapacity}</div>
              <div className="text-sm text-gray-600">Total Capacity</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.occupiedSeats}</div>
              <div className="text-sm text-gray-600">Currently Seated</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.efficiency}%</div>
              <div className="text-sm text-gray-600">Utilization</div>
            </div>
          </div>
          {stats.suggestions.length > 0 && (
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <div className="text-sm font-medium text-blue-800 mb-1">Optimization Tips:</div>
              <ul className="text-sm text-blue-700 space-y-1">
                {stats.suggestions.map((suggestion, idx) => (
                  <li key={idx}>• {suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Smart Suggestions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Smart Seating Suggestions
        </h3>
        
        {allSuggestions.map((suggestion, index) => (
          <Card key={index} className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    {suggestion.guestGroup.isParty && <Users className="h-4 w-4 text-pink-600" />}
                    {suggestion.guestGroup.name}
                    <span className="text-sm text-gray-600">
                      ({suggestion.guestGroup.isParty ? suggestion.guestGroup.partySize : suggestion.guestGroup.count} guests)
                    </span>
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">{suggestion.reason}</p>
                </div>
                <Badge className={`${getEfficiencyColor(suggestion.efficiency)} flex items-center gap-1`}>
                  {getEfficiencyIcon(suggestion.efficiency)}
                  {suggestion.efficiency}
                </Badge>
              </div>

              {suggestion.recommendedTables.length > 0 && (
                <div className="space-y-3">
                  {/* Primary Recommendation */}
                  <div className="bg-green-50 p-3 rounded border border-green-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-green-800 mb-1">Recommended:</div>
                        <div className="flex gap-2">
                          {suggestion.recommendedTables.map(tableId => (
                            <Badge key={tableId} className="bg-green-100 text-green-800 border-green-300">
                              Table {tableId}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleAllocate(suggestion, suggestion.recommendedTables)}
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        Allocate
                      </Button>
                    </div>
                  </div>

                  {/* Alternative Suggestions */}
                  {suggestion.alternatives && suggestion.alternatives.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Alternatives:</div>
                      {suggestion.alternatives.map((alt, altIndex) => (
                        <div key={altIndex} className="bg-gray-50 p-2 rounded border border-gray-200 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                              {alt.tables.map(tableId => (
                                <Badge key={tableId} variant="outline" className="text-xs">
                                  T{tableId}
                                </Badge>
                              ))}
                            </div>
                            <span className="text-sm text-gray-600">{alt.reason}</span>
                            <Badge className={`${getEfficiencyColor(alt.efficiency)} text-xs`}>
                              {alt.efficiency}
                            </Badge>
                          </div>
                          <Button
                            onClick={() => handleAllocate(suggestion, alt.tables)}
                            variant="outline"
                            size="sm"
                          >
                            Use This
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {suggestion.recommendedTables.length === 0 && (
                <div className="bg-red-50 p-3 rounded border border-red-200">
                  <div className="text-red-800 text-sm">No suitable tables currently available</div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SmartAllocation;
