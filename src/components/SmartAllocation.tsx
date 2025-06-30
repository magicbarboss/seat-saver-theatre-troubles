import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Users, Target, AlertCircle, CheckCircle, Zap, Theater, Crown } from 'lucide-react';
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
  const [selectedStrategy, setSelectedStrategy] = useState<number>(0);

  // Updated table layout for theatre: 13 tables total
  const defaultTables: TableInfo[] = [
    // Front Row - 2-seater tables (1-3)
    { id: 1, capacity: 2, isOccupied: false },
    { id: 2, capacity: 2, isOccupied: false },
    { id: 3, capacity: 2, isOccupied: false },
    // Second Row - 4-seater tables (4-6)
    { id: 4, capacity: 4, isOccupied: false },
    { id: 5, capacity: 4, isOccupied: false },
    { id: 6, capacity: 4, isOccupied: false },
    // Third Row - 4-seater tables (7-9)
    { id: 7, capacity: 4, isOccupied: false },
    { id: 8, capacity: 4, isOccupied: false },
    { id: 9, capacity: 4, isOccupied: false },
    // Back Row - 2-seater tables (10-13)
    { id: 10, capacity: 2, isOccupied: false },
    { id: 11, capacity: 2, isOccupied: false },
    { id: 12, capacity: 2, isOccupied: false },
    { id: 13, capacity: 2, isOccupied: false }
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

  // Get theatre seating strategies
  const theatreStrategies = useMemo(() => {
    try {
      return allocator.getTheatreSeatingStrategies();
    } catch (error) {
      console.log('Theatre strategies not available, using fallback');
      return [];
    }
  }, [allocator]);

  // Get suggestions for all guest groups (fallback method)
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

  // Handle table allocation for strategy arrangements
  const handleStrategyAllocation = (arrangement: any) => {
    arrangement.guestGroups.forEach((group: GuestGroup) => {
      if (group.isParty && group.partyMembers) {
        // Allocate all party members to the same tables
        group.partyMembers.forEach(memberIndex => {
          onTableAllocated(memberIndex, arrangement.tableIds);
        });
      } else {
        onTableAllocated(group.guestIndex, arrangement.tableIds);
      }
    });
  };

  // Handle individual suggestion allocation
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
          <Theater className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No guests waiting for theatre seating</p>
        </CardContent>
      </Card>
    );
  }

  // Analyze guest composition for display
  const couples = guestGroups.filter(g => (g.isParty ? g.partySize : g.count) === 2);
  const largeGroups = guestGroups.filter(g => (g.isParty ? g.partySize : g.count) >= 5);
  const individuals = guestGroups.filter(g => (g.isParty ? g.partySize : g.count) < 5 && (g.isParty ? g.partySize : g.count) !== 2);

  return (
    <div className="space-y-6">
      {/* Theatre Stats Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Theater className="h-5 w-5 text-purple-600" />
            Theatre Seating Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{couples.length}</div>
              <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                <Crown className="h-3 w-3" />
                Couples
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{largeGroups.length}</div>
              <div className="text-sm text-gray-600">Large Groups</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{individuals.length}</div>
              <div className="text-sm text-gray-600">Other Guests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.occupiedSeats}</div>
              <div className="text-sm text-gray-600">Currently Seated</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.efficiency}%</div>
              <div className="text-sm text-gray-600">Theatre Utilization</div>
            </div>
          </div>
          
          {/* Guest Composition Summary */}
          <div className="bg-purple-50 p-4 rounded border border-purple-200 mb-4">
            <div className="text-sm font-medium text-purple-800 mb-2">Theatre Seating Insights:</div>
            <div className="text-sm text-purple-700 space-y-1">
              {couples.length > 0 && <div>• {couples.length} couples - perfect for front row premium seating</div>}
              {largeGroups.length > 0 && <div>• {largeGroups.length} large groups - need adjacent table combinations</div>}
              {individuals.length > 0 && <div>• {individuals.length} smaller groups - flexible seating throughout theatre</div>}
            </div>
          </div>

          {stats.suggestions.length > 0 && (
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <div className="text-sm font-medium text-blue-800 mb-1">Theatre Optimization Tips:</div>
              <ul className="text-sm text-blue-700 space-y-1">
                {stats.suggestions.map((suggestion, idx) => (
                  <li key={idx}>• {suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Theatre Seating Strategies */}
      {theatreStrategies.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Theater className="h-5 w-5 text-purple-500" />
            Theatre Seating Strategies
          </h3>
          
          {/* Strategy Selection */}
          <div className="flex gap-2 flex-wrap">
            {theatreStrategies.map((strategy, index) => (
              <Button
                key={index}
                variant={selectedStrategy === index ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStrategy(index)}
                className="flex items-center gap-2"
              >
                {getEfficiencyIcon(strategy.overallEfficiency)}
                {strategy.strategy}
              </Button>
            ))}
          </div>

          {/* Selected Strategy Details */}
          {theatreStrategies[selectedStrategy] && (
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-800">{theatreStrategies[selectedStrategy].strategy}</h4>
                    <p className="text-sm text-gray-600 mt-1">{theatreStrategies[selectedStrategy].description}</p>
                  </div>
                  <Badge className={`${getEfficiencyColor(theatreStrategies[selectedStrategy].overallEfficiency)} flex items-center gap-1`}>
                    {getEfficiencyIcon(theatreStrategies[selectedStrategy].overallEfficiency)}
                    {theatreStrategies[selectedStrategy].overallEfficiency}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {theatreStrategies[selectedStrategy].arrangements.map((arrangement: any, arrIndex: number) => (
                    <div key={arrIndex} className={`p-3 rounded border ${
                      arrangement.priority === 'high' ? 'bg-green-50 border-green-200' :
                      arrangement.priority === 'medium' ? 'bg-blue-50 border-blue-200' :
                      'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-800 mb-1">
                            {arrangement.guestGroups.map((g: GuestGroup) => g.name).join(', ')}
                          </div>
                          <div className="text-sm text-gray-600 mb-2">{arrangement.reason}</div>
                          <div className="flex gap-2">
                            {arrangement.tableIds.map((tableId: number) => (
                              <Badge key={tableId} variant="outline" className="text-xs">
                                Table {tableId}
                              </Badge>
                            ))}
                            {arrangement.chairsNeeded > 0 && (
                              <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                                +{arrangement.chairsNeeded} chairs
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleStrategyAllocation(arrangement)}
                          className="bg-purple-600 hover:bg-purple-700"
                          size="sm"
                        >
                          Seat Guests
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        // Fallback to individual suggestions
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Individual Seating Suggestions
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
      )}
    </div>
  );
};

export default SmartAllocation;
