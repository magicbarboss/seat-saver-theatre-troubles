export interface TableInfo {
  id: number;
  capacity: number;
  isOccupied: boolean;
  currentGuests?: number;
}

export interface GuestGroup {
  guestIndex: number;
  name: string;
  count: number;
  showTime: string;
  isParty?: boolean;
  partyMembers?: number[];
  partySize?: number;
}

export interface AllocationSuggestion {
  guestGroup: GuestGroup;
  recommendedTables: number[];
  efficiency: 'excellent' | 'good' | 'fair' | 'poor';
  reason: string;
  alternatives?: {
    tables: number[];
    reason: string;
    efficiency: 'excellent' | 'good' | 'fair' | 'poor';
  }[];
}

export class SmartTableAllocator {
  private tables: TableInfo[];
  private guestGroups: GuestGroup[];

  constructor(tables: TableInfo[], guestGroups: GuestGroup[]) {
    this.tables = tables;
    this.guestGroups = guestGroups;
  }

  // Get allocation suggestions for a specific guest group
  getSuggestions(guestGroup: GuestGroup): AllocationSuggestion {
    const suggestions = this.calculateBestFit(guestGroup);
    return suggestions;
  }

  // Get theatre-specific allocation suggestions
  getTheatreSeatingStrategies(): any[] {
    const { TheatreSeatingAnalyzer } = require('./theatreSeatingLogic');
    const analysis = TheatreSeatingAnalyzer.analyzeGuestComposition(this.guestGroups);
    const strategies = TheatreSeatingAnalyzer.generateSeatingStrategies(analysis, this.tables);
    
    return strategies;
  }

  // Enhanced calculation that considers theatre seating
  private calculateBestFit(guestGroup: GuestGroup): AllocationSuggestion {
    const availableTables = this.tables.filter(table => !table.isOccupied);
    const guestCount = guestGroup.isParty ? guestGroup.partySize! : guestGroup.count;

    // Theatre-specific logic for couples (2 guests)
    if (guestCount === 2) {
      return this.handleCoupleSeating(guestGroup, availableTables);
    }

    // Theatre-specific logic for large groups (5+ guests)
    if (guestCount >= 5) {
      return this.handleLargePartySeating(guestGroup, availableTables);
    }

    // Standard logic for other groups
    return this.handleStandardSeating(guestGroup, availableTables);
  }

  private handleCoupleSeating(guestGroup: GuestGroup, availableTables: TableInfo[]): AllocationSuggestion {
    // Prioritize front row for couples
    const frontRowTables = availableTables.filter(table => [1, 2, 3].includes(table.id));
    
    if (frontRowTables.length > 0) {
      const bestFrontTable = frontRowTables[0];
      return {
        guestGroup,
        recommendedTables: [bestFrontTable.id],
        efficiency: 'excellent',
        reason: `Couple seated in front row (Table ${bestFrontTable.id}) for optimal theatre experience`,
        alternatives: this.getCoupleAlternatives(guestGroup, availableTables, [bestFrontTable.id])
      };
    }

    // Fallback to any 2-seater table
    const suitableTable = availableTables.find(table => table.capacity >= 2);
    if (suitableTable) {
      return {
        guestGroup,
        recommendedTables: [suitableTable.id],
        efficiency: 'good',
        reason: `Couple seated at Table ${suitableTable.id} (chairs can be adjusted as needed)`,
        alternatives: this.getCoupleAlternatives(guestGroup, availableTables, [suitableTable.id])
      };
    }

    return this.noSuitableTablesResponse(guestGroup);
  }

  private handleLargePartySeating(guestGroup: GuestGroup, availableTables: TableInfo[]): AllocationSuggestion {
    const guestCount = guestGroup.isParty ? guestGroup.partySize! : guestGroup.count;
    
    // Try adjacent table combinations
    const adjacentCombination = this.findAdjacentTheatreTables(guestCount, availableTables);
    
    if (adjacentCombination.length > 0) {
      const totalCapacity = adjacentCombination.reduce((sum, table) => sum + table.capacity, 0);
      const chairsNeeded = Math.max(0, guestCount - totalCapacity);
      
      return {
        guestGroup,
        recommendedTables: adjacentCombination.map(t => t.id),
        efficiency: chairsNeeded <= 2 ? 'excellent' : 'good',
        reason: `Large party (${guestCount} guests) seated together using Tables ${adjacentCombination.map(t => t.id).join(', ')}${chairsNeeded > 0 ? ` + ${chairsNeeded} extra chairs` : ''}`,
        alternatives: this.getLargePartyAlternatives(guestGroup, availableTables, adjacentCombination.map(t => t.id))
      };
    }

    return this.noSuitableTablesResponse(guestGroup);
  }

  private handleStandardSeating(guestGroup: GuestGroup, availableTables: TableInfo[]): AllocationSuggestion {
    const guestCount = guestGroup.isParty ? guestGroup.partySize! : guestGroup.count;
    
    // Find best single table (with chair flexibility)
    const suitableTable = availableTables.find(table => 
      table.capacity >= guestCount - 1 && table.capacity <= guestCount + 2
    );
    
    if (suitableTable) {
      const chairAdjustment = guestCount - suitableTable.capacity;
      const efficiency = Math.abs(chairAdjustment) <= 1 ? 'excellent' : 'good';
      
      return {
        guestGroup,
        recommendedTables: [suitableTable.id],
        efficiency,
        reason: `Table ${suitableTable.id} for ${guestCount} guests ${chairAdjustment > 0 ? `(+${chairAdjustment} chairs needed)` : chairAdjustment < 0 ? `(${Math.abs(chairAdjustment)} fewer chairs)` : '(perfect fit)'}`,
        alternatives: this.getStandardAlternatives(guestGroup, availableTables, [suitableTable.id])
      };
    }

    return this.noSuitableTablesResponse(guestGroup);
  }

  private findAdjacentTheatreTables(guestCount: number, availableTables: TableInfo[]): TableInfo[] {
    // Define theatre rows
    const rows = [
      { ids: [1, 2, 3], name: 'Front' },
      { ids: [4, 5, 6], name: 'Second' },
      { ids: [7, 8, 9], name: 'Third' },
      { ids: [10, 11, 12, 13], name: 'Back' }
    ];

    // Try combinations within each row
    for (const row of rows) {
      const rowTables = availableTables.filter(table => row.ids.includes(table.id));
      
      // Try 2-table combinations
      for (let i = 0; i < rowTables.length - 1; i++) {
        const combo = rowTables.slice(i, i + 2);
        const totalCapacity = combo.reduce((sum, t) => sum + t.capacity, 0);
        
        if (totalCapacity >= guestCount - 2 && totalCapacity <= guestCount + 3) {
          return combo;
        }
      }
      
      // Try 3-table combinations for very large groups
      if (guestCount > 8) {
        for (let i = 0; i < rowTables.length - 2; i++) {
          const combo = rowTables.slice(i, i + 3);
          const totalCapacity = combo.reduce((sum, t) => sum + t.capacity, 0);
          
          if (totalCapacity >= guestCount - 3 && totalCapacity <= guestCount + 4) {
            return combo;
          }
        }
      }
    }

    // Fallback: try cross-row adjacent tables
    const crossRowCombinations = [
      [3, 6, 9], // Right side connection
      [4, 7], [5, 8], [6, 9], // Vertical connections
    ];

    for (const combo of crossRowCombinations) {
      const tables = availableTables.filter(table => combo.includes(table.id));
      if (tables.length === combo.length) {
        const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
        if (totalCapacity >= guestCount - 2 && totalCapacity <= guestCount + 3) {
          return tables;
        }
      }
    }

    return [];
  }

  private getCoupleAlternatives(guestGroup: GuestGroup, availableTables: TableInfo[], exclude: number[]) {
    return availableTables
      .filter(table => !exclude.includes(table.id) && table.capacity >= 2)
      .slice(0, 2)
      .map(table => ({
        tables: [table.id],
        reason: `Alternative seating at Table ${table.id}`,
        efficiency: [1, 2, 3].includes(table.id) ? 'good' as const : 'fair' as const
      }));
  }

  private getLargePartyAlternatives(guestGroup: GuestGroup, availableTables: TableInfo[], exclude: number[]) {
    const remaining = availableTables.filter(table => !exclude.includes(table.id));
    const guestCount = guestGroup.isParty ? guestGroup.partySize! : guestGroup.count;
    
    // Try to find other combinations
    const alternatives = [];
    
    // Single large table option
    const largeTable = remaining.find(table => table.capacity >= guestCount - 2);
    if (largeTable) {
      alternatives.push({
        tables: [largeTable.id],
        reason: `Single table option with chair adjustments`,
        efficiency: 'fair' as const
      });
    }

    return alternatives.slice(0, 2);
  }

  private getStandardAlternatives(guestGroup: GuestGroup, availableTables: TableInfo[], exclude: number[]) {
    const guestCount = guestGroup.isParty ? guestGroup.partySize! : guestGroup.count;
    
    return availableTables
      .filter(table => !exclude.includes(table.id) && table.capacity >= guestCount - 1)
      .slice(0, 2)
      .map(table => {
        const chairDiff = guestCount - table.capacity;
        const efficiency = Math.abs(chairDiff) <= 1 ? 'good' as const : 'fair' as const;
        
        return {
          tables: [table.id],
          reason: `Table ${table.id} ${chairDiff > 0 ? `(+${chairDiff} chairs)` : chairDiff < 0 ? `(${Math.abs(chairDiff)} fewer chairs)` : '(perfect fit)'}`,
          efficiency
        };
      });
  }

  private noSuitableTablesResponse(guestGroup: GuestGroup): AllocationSuggestion {
    return {
      guestGroup,
      recommendedTables: [],
      efficiency: 'poor',
      reason: 'No suitable tables available - consider rearranging existing seating',
      alternatives: []
    };
  }

  // Get overall allocation efficiency stats
  getAllocationStats(): {
    totalCapacity: number;
    occupiedSeats: number;
    efficiency: number;
    suggestions: string[];
  } {
    const totalCapacity = this.tables.reduce((sum, table) => sum + table.capacity, 0);
    const occupiedSeats = this.tables
      .filter(table => table.isOccupied)
      .reduce((sum, table) => sum + (table.currentGuests || table.capacity), 0);
    
    const efficiency = totalCapacity > 0 ? (occupiedSeats / totalCapacity) * 100 : 0;
    
    const suggestions = [];
    if (efficiency < 60) {
      suggestions.push("Consider combining smaller groups in adjacent seating");
    }
    if (efficiency > 85) {
      suggestions.push("High utilization - consider adding extra chairs to tables");
    }

    return {
      totalCapacity,
      occupiedSeats,
      efficiency: Math.round(efficiency),
      suggestions
    };
  }
}

// Helper function to detect if guests should be grouped as parties
export const detectPartyGroups = (checkedInGuests: any[], partyConnections: Map<string, any>): GuestGroup[] => {
  const processedGuests = new Set<number>();
  const groups: GuestGroup[] = [];

  // First, process party groups
  for (const [, party] of partyConnections) {
    const partyGuestIndices = party.bookingIndices.filter((index: number) => 
      checkedInGuests.some(guest => guest.originalIndex === index)
    );

    if (partyGuestIndices.length > 1) {
      const representativeGuest = checkedInGuests.find(guest => 
        guest.originalIndex === partyGuestIndices[0]
      );

      if (representativeGuest) {
        groups.push({
          guestIndex: representativeGuest.originalIndex,
          name: `${party.guestNames.join(' & ')} (Party)`,
          count: representativeGuest.count,
          showTime: representativeGuest.showTime,
          isParty: true,
          partyMembers: partyGuestIndices,
          partySize: party.totalGuests
        });

        partyGuestIndices.forEach((index: number) => processedGuests.add(index));
      }
    }
  }

  // Then, process individual guests
  checkedInGuests.forEach(guest => {
    if (!processedGuests.has(guest.originalIndex)) {
      groups.push({
        guestIndex: guest.originalIndex,
        name: guest.name,
        count: guest.count,
        showTime: guest.showTime,
        isParty: false
      });
    }
  });

  return groups;
};
