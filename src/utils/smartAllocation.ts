
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

  // Calculate best table fit for a guest group
  private calculateBestFit(guestGroup: GuestGroup): AllocationSuggestion {
    const availableTables = this.tables.filter(table => !table.isOccupied);
    const guestCount = guestGroup.isParty ? guestGroup.partySize! : guestGroup.count;

    // Strategy 1: Perfect single table fit
    const perfectFit = availableTables.find(table => table.capacity === guestCount);
    if (perfectFit) {
      return {
        guestGroup,
        recommendedTables: [perfectFit.id],
        efficiency: 'excellent',
        reason: `Perfect fit: ${guestCount} guests for ${perfectFit.capacity}-seat table`,
        alternatives: this.getAlternatives(guestGroup, [perfectFit.id])
      };
    }

    // Strategy 2: Best single table fit (minimal waste)
    const bestSingleTable = availableTables
      .filter(table => table.capacity >= guestCount)
      .sort((a, b) => (a.capacity - guestCount) - (b.capacity - guestCount))[0];

    if (bestSingleTable) {
      const wastedSeats = bestSingleTable.capacity - guestCount;
      const efficiency = wastedSeats <= 1 ? 'good' : wastedSeats <= 2 ? 'fair' : 'poor';
      
      return {
        guestGroup,
        recommendedTables: [bestSingleTable.id],
        efficiency,
        reason: `Single table: ${guestCount} guests, ${wastedSeats} empty seat${wastedSeats !== 1 ? 's' : ''}`,
        alternatives: this.getAlternatives(guestGroup, [bestSingleTable.id])
      };
    }

    // Strategy 3: Multiple table combination for large parties
    if (guestCount > 8) {
      const tableCombination = this.findTableCombination(guestCount, availableTables);
      if (tableCombination.length > 0) {
        const totalCapacity = tableCombination.reduce((sum, table) => sum + table.capacity, 0);
        const wastedSeats = totalCapacity - guestCount;
        const efficiency = wastedSeats <= 2 ? 'good' : wastedSeats <= 4 ? 'fair' : 'poor';

        return {
          guestGroup,
          recommendedTables: tableCombination.map(t => t.id),
          efficiency,
          reason: `Large party: ${tableCombination.length} adjacent tables, ${wastedSeats} empty seats`,
          alternatives: []
        };
      }
    }

    // No suitable tables found
    return {
      guestGroup,
      recommendedTables: [],
      efficiency: 'poor',
      reason: 'No suitable tables available for this group size',
      alternatives: []
    };
  }

  // Find best combination of tables for large groups
  private findTableCombination(guestCount: number, availableTables: TableInfo[]): TableInfo[] {
    // Sort tables by capacity (largest first)
    const sortedTables = [...availableTables].sort((a, b) => b.capacity - a.capacity);
    
    // Try to find combination that minimizes waste
    for (let i = 0; i < sortedTables.length; i++) {
      for (let j = i + 1; j < sortedTables.length; j++) {
        const table1 = sortedTables[i];
        const table2 = sortedTables[j];
        const combinedCapacity = table1.capacity + table2.capacity;
        
        if (combinedCapacity >= guestCount && combinedCapacity - guestCount <= 4) {
          return [table1, table2];
        }
      }
    }

    // If no good combination found, return largest available table
    return sortedTables.length > 0 ? [sortedTables[0]] : [];
  }

  // Get alternative seating suggestions
  private getAlternatives(guestGroup: GuestGroup, excludeTables: number[]): AllocationSuggestion['alternatives'] {
    const guestCount = guestGroup.isParty ? guestGroup.partySize! : guestGroup.count;
    const availableTables = this.tables
      .filter(table => !table.isOccupied && !excludeTables.includes(table.id))
      .filter(table => table.capacity >= guestCount);

    return availableTables.slice(0, 2).map(table => {
      const wastedSeats = table.capacity - guestCount;
      const efficiency = wastedSeats <= 1 ? 'good' : wastedSeats <= 2 ? 'fair' : 'poor';
      
      return {
        tables: [table.id],
        reason: `Alternative: ${guestCount} guests, ${wastedSeats} empty seat${wastedSeats !== 1 ? 's' : ''}`,
        efficiency
      };
    });
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
      suggestions.push("Consider combining smaller groups");
    }
    if (efficiency > 85) {
      suggestions.push("High utilization - consider larger tables");
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
