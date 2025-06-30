
import { TableInfo, GuestGroup } from './smartAllocation';

export interface TheatreSeatingAnalysis {
  couples: GuestGroup[];
  largeGroups: GuestGroup[];
  individuals: GuestGroup[];
  totalGuests: number;
}

export interface TheatreSeatingStrategy {
  strategy: string;
  arrangements: {
    tableIds: number[];
    guestGroups: GuestGroup[];
    chairsNeeded: number;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  overallEfficiency: 'excellent' | 'good' | 'fair' | 'poor';
  description: string;
}

// Define theatre adjacency map - which tables can work together
const THEATRE_ADJACENCY = {
  // Front row tables can combine
  frontRow: [1, 2, 3],
  // Second row tables can combine
  secondRow: [4, 5, 6],
  // Third row tables can combine  
  thirdRow: [7, 8, 9],
  // Back row tables can combine
  backRow: [10, 11, 12, 13],
  // Cross-row connections (tables that are close across rows)
  crossConnections: {
    1: [4], 2: [5], 3: [6, 9],
    4: [1, 7], 5: [2, 8], 6: [3, 9],
    7: [4, 10], 8: [5, 11], 9: [6, 12],
    10: [7, 13], 11: [8, 12], 12: [9, 11], 13: [10]
  }
};

export class TheatreSeatingAnalyzer {
  
  static analyzeGuestComposition(guestGroups: GuestGroup[]): TheatreSeatingAnalysis {
    const couples: GuestGroup[] = [];
    const largeGroups: GuestGroup[] = [];
    const individuals: GuestGroup[] = [];
    
    let totalGuests = 0;
    
    guestGroups.forEach(group => {
      const guestCount = group.isParty ? group.partySize! : group.count;
      totalGuests += guestCount;
      
      if (guestCount === 2) {
        couples.push(group);
      } else if (guestCount >= 5) {
        largeGroups.push(group);
      } else {
        individuals.push(group);
      }
    });
    
    return { couples, largeGroups, individuals, totalGuests };
  }
  
  static generateSeatingStrategies(
    analysis: TheatreSeatingAnalysis, 
    availableTables: TableInfo[]
  ): TheatreSeatingStrategy[] {
    const strategies: TheatreSeatingStrategy[] = [];
    
    // Strategy 1: Couples-first front row strategy
    if (analysis.couples.length > 0) {
      strategies.push(this.createCouplesFrontRowStrategy(analysis, availableTables));
    }
    
    // Strategy 2: Large groups adjacent seating
    if (analysis.largeGroups.length > 0) {
      strategies.push(this.createLargeGroupStrategy(analysis, availableTables));
    }
    
    // Strategy 3: Mixed arrangement strategy
    strategies.push(this.createMixedArrangementStrategy(analysis, availableTables));
    
    // Strategy 4: Row-by-row fill strategy
    strategies.push(this.createRowByRowStrategy(analysis, availableTables));
    
    return strategies.sort((a, b) => {
      const efficiencyOrder = { excellent: 4, good: 3, fair: 2, poor: 1 };
      return efficiencyOrder[b.overallEfficiency] - efficiencyOrder[a.overallEfficiency];
    });
  }
  
  private static createCouplesFrontRowStrategy(
    analysis: TheatreSeatingAnalysis, 
    availableTables: TableInfo[]
  ): TheatreSeatingStrategy {
    const arrangements = [];
    const frontRowTables = availableTables.filter(t => THEATRE_ADJACENCY.frontRow.includes(t.id));
    
    // Place couples in front row
    let usedFrontTables = [];
    analysis.couples.forEach((couple, index) => {
      if (index < frontRowTables.length) {
        const table = frontRowTables[index];
        arrangements.push({
          tableIds: [table.id],
          guestGroups: [couple],
          chairsNeeded: 2,
          reason: `Couple seated in front row for optimal theatre experience`,
          priority: 'high' as const
        });
        usedFrontTables.push(table.id);
      }
    });
    
    // Handle remaining guests
    const remainingGuests = [...analysis.largeGroups, ...analysis.individuals];
    const remainingTables = availableTables.filter(t => !usedFrontTables.includes(t.id));
    
    remainingGuests.forEach(group => {
      const guestCount = group.isParty ? group.partySize! : group.count;
      const suitableTables = this.findBestTableCombination(guestCount, remainingTables);
      
      if (suitableTables.length > 0) {
        arrangements.push({
          tableIds: suitableTables.map(t => t.id),
          guestGroups: [group],
          chairsNeeded: guestCount,
          reason: `${guestCount > 4 ? 'Large group' : 'Small group'} seated in available theatre area`,
          priority: guestCount > 4 ? 'medium' as const : 'low' as const
        });
      }
    });
    
    return {
      strategy: 'Couples-First Front Row',
      arrangements,
      overallEfficiency: arrangements.length === analysis.couples.length + analysis.largeGroups.length + analysis.individuals.length ? 'excellent' : 'good',
      description: `${analysis.couples.length} couples prioritized in front row, remaining guests distributed throughout theatre`
    };
  }
  
  private static createLargeGroupStrategy(
    analysis: TheatreSeatingAnalysis, 
    availableTables: TableInfo[]
  ): TheatreSeatingStrategy {
    const arrangements = [];
    
    analysis.largeGroups.forEach(group => {
      const guestCount = group.isParty ? group.partySize! : group.count;
      const adjacentTables = this.findAdjacentTableCombination(guestCount, availableTables);
      
      if (adjacentTables.length > 0) {
        arrangements.push({
          tableIds: adjacentTables.map(t => t.id),
          guestGroups: [group],
          chairsNeeded: guestCount,
          reason: `Large party seated together using adjacent tables`,
          priority: 'high' as const
        });
      }
    });
    
    return {
      strategy: 'Large Groups Adjacent',
      arrangements,
      overallEfficiency: arrangements.length === analysis.largeGroups.length ? 'excellent' : 'fair',
      description: `Focus on keeping large parties together in adjacent seating areas`
    };
  }
  
  private static createMixedArrangementStrategy(
    analysis: TheatreSeatingAnalysis, 
    availableTables: TableInfo[]
  ): TheatreSeatingStrategy {
    const arrangements = [];
    
    // Distribute all groups optimally
    const allGroups = [...analysis.couples, ...analysis.largeGroups, ...analysis.individuals];
    allGroups.forEach(group => {
      const guestCount = group.isParty ? group.partySize! : group.count;
      const bestTables = this.findBestTableCombination(guestCount, availableTables);
      
      if (bestTables.length > 0) {
        arrangements.push({
          tableIds: bestTables.map(t => t.id),
          guestGroups: [group],
          chairsNeeded: guestCount,
          reason: `Optimal seating based on group size and table availability`,
          priority: guestCount === 2 ? 'high' as const : guestCount > 4 ? 'medium' as const : 'low' as const
        });
      }
    });
    
    return {
      strategy: 'Mixed Optimal Arrangement',
      arrangements,
      overallEfficiency: 'good',
      description: `Balanced approach considering all guest groups and theatre layout`
    };
  }
  
  private static createRowByRowStrategy(
    analysis: TheatreSeatingAnalysis, 
    availableTables: TableInfo[]
  ): TheatreSeatingStrategy {
    const arrangements = [];
    const rows = [
      { name: 'Front', tables: availableTables.filter(t => THEATRE_ADJACENCY.frontRow.includes(t.id)) },
      { name: 'Second', tables: availableTables.filter(t => THEATRE_ADJACENCY.secondRow.includes(t.id)) },
      { name: 'Third', tables: availableTables.filter(t => THEATRE_ADJACENCY.thirdRow.includes(t.id)) },
      { name: 'Back', tables: availableTables.filter(t => THEATRE_ADJACENCY.backRow.includes(t.id)) }
    ];
    
    const allGroups = [...analysis.couples, ...analysis.largeGroups, ...analysis.individuals];
    let groupIndex = 0;
    
    rows.forEach(row => {
      if (groupIndex < allGroups.length && row.tables.length > 0) {
        const group = allGroups[groupIndex];
        const guestCount = group.isParty ? group.partySize! : group.count;
        
        arrangements.push({
          tableIds: [row.tables[0].id],
          guestGroups: [group],
          chairsNeeded: guestCount,
          reason: `${row.name} row seating for theatre viewing`,
          priority: row.name === 'Front' ? 'high' as const : 'medium' as const
        });
        
        groupIndex++;
      }
    });
    
    return {
      strategy: 'Row-by-Row Fill',
      arrangements,
      overallEfficiency: 'fair',
      description: `Systematic row-by-row seating from front to back`
    };
  }
  
  private static findAdjacentTableCombination(guestCount: number, tables: TableInfo[]): TableInfo[] {
    // Try to find adjacent tables that can accommodate the group
    const rows = [
      THEATRE_ADJACENCY.frontRow,
      THEATRE_ADJACENCY.secondRow,
      THEATRE_ADJACENCY.thirdRow,
      THEATRE_ADJACENCY.backRow
    ];
    
    for (const row of rows) {
      const rowTables = tables.filter(t => row.includes(t.id) && !t.isOccupied);
      
      // Try combinations of 2-3 adjacent tables in the same row
      for (let i = 0; i < rowTables.length - 1; i++) {
        const combo2 = rowTables.slice(i, i + 2);
        const capacity2 = combo2.reduce((sum, t) => sum + t.capacity, 0);
        
        if (capacity2 >= guestCount - 2 && capacity2 <= guestCount + 2) {
          return combo2;
        }
        
        // Try 3-table combination
        if (i < rowTables.length - 2) {
          const combo3 = rowTables.slice(i, i + 3);
          const capacity3 = combo3.reduce((sum, t) => sum + t.capacity, 0);
          
          if (capacity3 >= guestCount - 2 && capacity3 <= guestCount + 3) {
            return combo3;
          }
        }
      }
    }
    
    return this.findBestTableCombination(guestCount, tables);
  }
  
  private static findBestTableCombination(guestCount: number, tables: TableInfo[]): TableInfo[] {
    const availableTables = tables.filter(t => !t.isOccupied);
    
    // Single table solution
    const singleTable = availableTables.find(t => t.capacity >= guestCount - 1 && t.capacity <= guestCount + 2);
    if (singleTable) {
      return [singleTable];
    }
    
    // Two table solution
    for (let i = 0; i < availableTables.length - 1; i++) {
      for (let j = i + 1; j < availableTables.length; j++) {
        const combo = [availableTables[i], availableTables[j]];
        const totalCapacity = combo.reduce((sum, t) => sum + t.capacity, 0);
        
        if (totalCapacity >= guestCount - 1 && totalCapacity <= guestCount + 3) {
          return combo;
        }
      }
    }
    
    return availableTables.slice(0, 1);
  }
}
