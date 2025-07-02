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
    baseCapacity: number;
    extraChairs: number;
    efficiency: number;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  overallEfficiency: 'excellent' | 'good' | 'fair' | 'poor';
  description: string;
}

// Define theatre layout with actual capacities
const THEATRE_LAYOUT = {
  // Front row - 2-seater tables (intimate/couple seating)
  frontRow: { ids: [1, 2, 3], baseCapacity: 2, maxCapacity: 4 },
  // Second row - 4-seater tables (main seating)
  secondRow: { ids: [4, 5, 6], baseCapacity: 4, maxCapacity: 6 },
  // Third row - 4-seater tables (main seating)
  thirdRow: { ids: [7, 8, 9], baseCapacity: 4, maxCapacity: 6 },
  // Back row - 2-seater tables (intimate/couple seating)
  backRow: { ids: [10, 11, 12, 13], baseCapacity: 2, maxCapacity: 4 }
};

// Enhanced adjacency groups for keeping parties together - now includes vertical and strategic connections
const ADJACENCY_GROUPS = [
  // Row groupings (existing)
  [1, 2, 3], // Front row
  [4, 5, 6], // Second row
  [7, 8, 9], // Third row
  [10, 11, 12, 13], // Back row
  
  // Horizontal adjacent pairs (existing)
  [4, 5], [5, 6], [7, 8], [8, 9], 
  
  // NEW: Vertical adjacent pairs - key for large groups
  [4, 7], [5, 8], [6, 9], [7, 10],
  
  // Cross-row connections (existing)
  [3, 6, 9], // Right side vertical
  [1, 4], [2, 5], [3, 6], [6, 9], // Cross-row connections
  
  // NEW: Strategic three-table combinations for very large parties
  [4, 5, 7], // L-shape around T4-T5-T7
  [5, 6, 8], // L-shape around T5-T6-T8
  [4, 7, 8], // Vertical strip T4-T7-T8
  [7, 8, 10], // Back area connection T7-T8-T10
];

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
    
    // Strategy 1: Optimal efficiency - minimize extra chairs
    strategies.push(this.createOptimalEfficiencyStrategy(analysis, availableTables));
    
    // Strategy 2: Couples-first front row (if couples exist)
    if (analysis.couples.length > 0) {
      strategies.push(this.createCouplesFrontRowStrategy(analysis, availableTables));
    }
    
    // Strategy 3: Large groups in main seating area
    if (analysis.largeGroups.length > 0) {
      strategies.push(this.createLargeGroupMainSeatingStrategy(analysis, availableTables));
    }
    
    return strategies.sort((a, b) => {
      const efficiencyOrder = { excellent: 4, good: 3, fair: 2, poor: 1 };
      return efficiencyOrder[b.overallEfficiency] - efficiencyOrder[a.overallEfficiency];
    });
  }
  
  private static createOptimalEfficiencyStrategy(
    analysis: TheatreSeatingAnalysis, 
    availableTables: TableInfo[]
  ): TheatreSeatingStrategy {
    const arrangements = [];
    const usedTables = new Set<number>();
    
    // Process all groups by size (largest first for efficiency)
    const allGroups = [...analysis.largeGroups, ...analysis.individuals, ...analysis.couples]
      .sort((a, b) => {
        const sizeA = a.isParty ? a.partySize! : a.count;
        const sizeB = b.isParty ? b.partySize! : b.count;
        return sizeB - sizeA;
      });
    
    allGroups.forEach(group => {
      const guestCount = group.isParty ? group.partySize! : group.count;
      const bestArrangement = this.findMostEfficientSeating(guestCount, availableTables, usedTables);
      
      if (bestArrangement) {
        arrangements.push({
          tableIds: bestArrangement.tableIds,
          guestGroups: [group],
          chairsNeeded: guestCount,
          baseCapacity: bestArrangement.baseCapacity,
          extraChairs: bestArrangement.extraChairs,
          efficiency: bestArrangement.efficiency,
          reason: bestArrangement.reason,
          priority: this.getPriority(guestCount, bestArrangement.efficiency)
        });
        
        bestArrangement.tableIds.forEach(id => usedTables.add(id));
      }
    });
    
    const avgEfficiency = arrangements.length > 0 
      ? arrangements.reduce((sum, arr) => sum + arr.efficiency, 0) / arrangements.length 
      : 0;
    
    return {
      strategy: 'Optimal Efficiency',
      arrangements,
      overallEfficiency: this.getOverallEfficiency(avgEfficiency),
      description: `Minimize extra chairs needed and maximize table utilization efficiency`
    };
  }
  
  private static createCouplesFrontRowStrategy(
    analysis: TheatreSeatingAnalysis, 
    availableTables: TableInfo[]
  ): TheatreSeatingStrategy {
    const arrangements = [];
    const usedTables = new Set<number>();
    
    // Place couples in front row first
    const frontRowTables = availableTables.filter(t => 
      THEATRE_LAYOUT.frontRow.ids.includes(t.id) && !usedTables.has(t.id)
    );
    
    analysis.couples.forEach((couple, index) => {
      if (index < frontRowTables.length) {
        const table = frontRowTables[index];
        arrangements.push({
          tableIds: [table.id],
          guestGroups: [couple],
          chairsNeeded: 2,
          baseCapacity: 2,
          extraChairs: 0,
          efficiency: 100,
          reason: `Couple seated in premium front row position`,
          priority: 'high' as const
        });
        usedTables.add(table.id);
      }
    });
    
    // Handle remaining guests efficiently
    const remainingGroups = [
      ...analysis.largeGroups, 
      ...analysis.individuals,
      ...analysis.couples.slice(frontRowTables.length)
    ].sort((a, b) => {
      const sizeA = a.isParty ? a.partySize! : a.count;
      const sizeB = b.isParty ? b.partySize! : b.count;
      return sizeB - sizeA;
    });
    
    remainingGroups.forEach(group => {
      const guestCount = group.isParty ? group.partySize! : group.count;
      const bestArrangement = this.findMostEfficientSeating(guestCount, availableTables, usedTables);
      
      if (bestArrangement) {
        arrangements.push({
          tableIds: bestArrangement.tableIds,
          guestGroups: [group],
          chairsNeeded: guestCount,
          baseCapacity: bestArrangement.baseCapacity,
          extraChairs: bestArrangement.extraChairs,
          efficiency: bestArrangement.efficiency,
          reason: bestArrangement.reason,
          priority: this.getPriority(guestCount, bestArrangement.efficiency)
        });
        
        bestArrangement.tableIds.forEach(id => usedTables.add(id));
      }
    });
    
    const avgEfficiency = arrangements.length > 0 
      ? arrangements.reduce((sum, arr) => sum + arr.efficiency, 0) / arrangements.length 
      : 0;
    
    return {
      strategy: 'Couples Front Row Priority',
      arrangements,
      overallEfficiency: this.getOverallEfficiency(avgEfficiency),
      description: `${analysis.couples.length} couples in front row, others seated efficiently`
    };
  }
  
  private static createLargeGroupMainSeatingStrategy(
    analysis: TheatreSeatingAnalysis, 
    availableTables: TableInfo[]
  ): TheatreSeatingStrategy {
    const arrangements = [];
    const usedTables = new Set<number>();
    
    // Focus on large groups first in main seating area (rows 2-3)
    const mainSeatingTables = availableTables.filter(t => 
      [...THEATRE_LAYOUT.secondRow.ids, ...THEATRE_LAYOUT.thirdRow.ids].includes(t.id)
    );
    
    analysis.largeGroups.forEach(group => {
      const guestCount = group.isParty ? group.partySize! : group.count;
      const bestArrangement = this.findMostEfficientSeating(
        guestCount, 
        mainSeatingTables.filter(t => !usedTables.has(t.id)), 
        usedTables
      );
      
      if (bestArrangement) {
        arrangements.push({
          tableIds: bestArrangement.tableIds,
          guestGroups: [group],
          chairsNeeded: guestCount,
          baseCapacity: bestArrangement.baseCapacity,
          extraChairs: bestArrangement.extraChairs,
          efficiency: bestArrangement.efficiency,
          reason: `Large group in main theatre seating area`,
          priority: 'high' as const
        });
        
        bestArrangement.tableIds.forEach(id => usedTables.add(id));
      }
    });
    
    // Fill remaining with other groups
    const remainingGroups = [...analysis.couples, ...analysis.individuals];
    remainingGroups.forEach(group => {
      const guestCount = group.isParty ? group.partySize! : group.count;
      const bestArrangement = this.findMostEfficientSeating(guestCount, availableTables, usedTables);
      
      if (bestArrangement) {
        arrangements.push({
          tableIds: bestArrangement.tableIds,
          guestGroups: [group],
          chairsNeeded: guestCount,
          baseCapacity: bestArrangement.baseCapacity,
          extraChairs: bestArrangement.extraChairs,
          efficiency: bestArrangement.efficiency,
          reason: bestArrangement.reason,
          priority: this.getPriority(guestCount, bestArrangement.efficiency)
        });
        
        bestArrangement.tableIds.forEach(id => usedTables.add(id));
      }
    });
    
    const avgEfficiency = arrangements.length > 0 
      ? arrangements.reduce((sum, arr) => sum + arr.efficiency, 0) / arrangements.length 
      : 0;
    
    return {
      strategy: 'Large Groups Main Seating',
      arrangements,
      overallEfficiency: this.getOverallEfficiency(avgEfficiency),
      description: `Large parties prioritized in main 4-seater areas for optimal comfort`
    };
  }
  
  private static findMostEfficientSeating(
    guestCount: number, 
    availableTables: TableInfo[], 
    usedTables: Set<number>
  ) {
    const unusedTables = availableTables.filter(t => !usedTables.has(t.id));
    const options = [];
    
    // Single table options
    unusedTables.forEach(table => {
      const extraChairs = Math.max(0, guestCount - table.capacity);
      const efficiency = Math.round((Math.min(guestCount, table.capacity) / table.capacity) * 100);
      
      // Prefer tables that don't need too many extra chairs
      if (extraChairs <= 2) {
        options.push({
          tableIds: [table.id],
          baseCapacity: table.capacity,
          extraChairs,
          efficiency,
          reason: `Table ${table.id} (${table.capacity}-seater)${extraChairs > 0 ? ` + ${extraChairs} chairs` : ''}`,
          wasteScore: Math.max(0, table.capacity - guestCount) + (extraChairs * 2) // Penalize both waste and extra chairs
        });
      }
    });
    
    // Two table combinations for larger groups
    if (guestCount >= 5) {
      for (let i = 0; i < unusedTables.length - 1; i++) {
        for (let j = i + 1; j < unusedTables.length; j++) {
          const table1 = unusedTables[i];
          const table2 = unusedTables[j];
          const totalCapacity = table1.capacity + table2.capacity;
          const extraChairs = Math.max(0, guestCount - totalCapacity);
          
          // Only consider if it's a reasonable fit
          if (extraChairs <= 3 && totalCapacity >= guestCount - 1) {
            const efficiency = Math.round((Math.min(guestCount, totalCapacity) / totalCapacity) * 100);
            const isAdjacent = this.areTablesAdjacent([table1.id, table2.id]);
            const isVerticalAdjacent = this.areTablesVerticallyAdjacent([table1.id, table2.id]);
            
            // Boost priority for vertical adjacencies, especially for large groups
            const adjacencyBonus = isVerticalAdjacent ? 3 : (isAdjacent ? 1 : 0);
            const largeGroupBonus = guestCount >= 7 && isVerticalAdjacent ? 2 : 0;
            
            options.push({
              tableIds: [table1.id, table2.id],
              baseCapacity: totalCapacity,
              extraChairs,
              efficiency,
              reason: `Tables ${table1.id}+${table2.id} (${totalCapacity} seats)${extraChairs > 0 ? ` + ${extraChairs} chairs` : ''}${isVerticalAdjacent ? ' - vertical adjacency' : isAdjacent ? ' - adjacent' : ''}`,
              wasteScore: Math.max(0, totalCapacity - guestCount) + (extraChairs * 2) - adjacencyBonus - largeGroupBonus
            });
          }
        }
      }
    }
    
    // Three table combinations for very large groups (10+ guests)
    if (guestCount >= 10) {
      for (let i = 0; i < unusedTables.length - 2; i++) {
        for (let j = i + 1; j < unusedTables.length - 1; j++) {
          for (let k = j + 1; k < unusedTables.length; k++) {
            const table1 = unusedTables[i];
            const table2 = unusedTables[j];
            const table3 = unusedTables[k];
            const totalCapacity = table1.capacity + table2.capacity + table3.capacity;
            const extraChairs = Math.max(0, guestCount - totalCapacity);
            
            // Only consider strategic three-table combinations
            const tableIds = [table1.id, table2.id, table3.id];
            const isStrategicCombo = this.isStrategicThreeTableCombo(tableIds);
            
            if (isStrategicCombo && extraChairs <= 4 && totalCapacity >= guestCount - 2) {
              const efficiency = Math.round((Math.min(guestCount, totalCapacity) / totalCapacity) * 100);
              
              options.push({
                tableIds,
                baseCapacity: totalCapacity,
                extraChairs,
                efficiency,
                reason: `Tables ${tableIds.join('+')} (${totalCapacity} seats)${extraChairs > 0 ? ` + ${extraChairs} chairs` : ''} - strategic layout`,
                wasteScore: Math.max(0, totalCapacity - guestCount) + (extraChairs * 2) - 2 // Bonus for strategic combo
              });
            }
          }
        }
      }
    }
    
    // Sort by efficiency: prefer higher efficiency and lower waste
    options.sort((a, b) => {
      // First priority: minimize extra chairs needed
      if (a.extraChairs !== b.extraChairs) {
        return a.extraChairs - b.extraChairs;
      }
      // Second priority: minimize waste (empty seats)
      if (a.wasteScore !== b.wasteScore) {
        return a.wasteScore - b.wasteScore;
      }
      // Third priority: higher efficiency
      return b.efficiency - a.efficiency;
    });
    
    return options[0] || null;
  }
  
  private static areTablesAdjacent(tableIds: number[]): boolean {
    return ADJACENCY_GROUPS.some(group => 
      tableIds.every(id => group.includes(id))
    );
  }
  
  // NEW: Check for vertical adjacency specifically (key for large groups)
  private static areTablesVerticallyAdjacent(tableIds: number[]): boolean {
    const verticalPairs = [[4, 7], [5, 8], [6, 9], [7, 10]];
    return verticalPairs.some(pair => 
      tableIds.length === 2 && tableIds.every(id => pair.includes(id))
    );
  }
  
  // NEW: Check if three tables form a strategic combination
  private static isStrategicThreeTableCombo(tableIds: number[]): boolean {
    const strategicCombos = [[4, 5, 7], [5, 6, 8], [4, 7, 8], [7, 8, 10]];
    return strategicCombos.some(combo => 
      tableIds.length === 3 && 
      tableIds.every(id => combo.includes(id)) &&
      combo.every(id => tableIds.includes(id))
    );
  }
  
  private static getPriority(guestCount: number, efficiency: number): 'high' | 'medium' | 'low' {
    if (guestCount === 2 || efficiency >= 90) return 'high';
    if (guestCount >= 5 || efficiency >= 75) return 'medium';
    return 'low';
  }
  
  private static getOverallEfficiency(avgEfficiency: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (avgEfficiency >= 85) return 'excellent';
    if (avgEfficiency >= 70) return 'good';
    if (avgEfficiency >= 50) return 'fair';
    return 'poor';
  }
}
