import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Save, Download, Upload, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { TableDesigner } from './TableDesigner';
import { SeatingChart } from './SeatingChart';
import { CheckedInGuest } from '../checkin/types';

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
}

interface SeatingManagementProps {
  checkedInGuests: CheckedInGuest[];
  onGuestTableAssign: (guestIndex: number, tableId: string) => void;
  onGuestTableRemove: (guestIndex: number) => void;
  showTime: string;
  friendshipGroups: Map<string, number[]>;
  onAddWalkIn?: (walkInData: { name: string; count: number; showTime: string; notes?: string }) => void;
  showTimes: string[];
}

export const SeatingManagement: React.FC<SeatingManagementProps> = ({
  checkedInGuests,
  onGuestTableAssign,
  onGuestTableRemove,
  showTime,
  friendshipGroups,
  onAddWalkIn,
  showTimes
}) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [activeTab, setActiveTab] = useState('seating');

  // Load saved table layout - synchronized with TableAllocation
  useEffect(() => {
    const savedLayout = localStorage.getItem(`table-allocation-state-v3-${showTime}`);
    if (savedLayout) {
      try {
        const parsedLayout = JSON.parse(savedLayout);
        setTables(parsedLayout);
      } catch (error) {
        console.error('Failed to load saved layout:', error);
      }
    } else {
      // Default layout with 14 tables matching TableAllocation
      const defaultTables: Table[] = [
        // Front row - 3 tables (T1-T3)
        { id: 'T1', x: 50, y: 100, width: 80, height: 60, seats: 2, shape: 'rectangle', label: 'T1', status: 'available' },
        { id: 'T2', x: 150, y: 100, width: 80, height: 60, seats: 2, shape: 'rectangle', label: 'T2', status: 'available' },
        { id: 'T3', x: 250, y: 100, width: 80, height: 60, seats: 2, shape: 'rectangle', label: 'T3', status: 'available' },
        
        // Row 2 - 3 larger tables (T4-T6)
        { id: 'T4', x: 50, y: 180, width: 100, height: 80, seats: 5, shape: 'rectangle', label: 'T4', status: 'available' },
        { id: 'T5', x: 170, y: 180, width: 100, height: 80, seats: 5, shape: 'rectangle', label: 'T5', status: 'available' },
        { id: 'T6', x: 290, y: 180, width: 90, height: 80, seats: 4, shape: 'rectangle', label: 'T6', status: 'available' },
        
        // Row 3 - 3 larger tables (T7-T9)
        { id: 'T7', x: 50, y: 280, width: 100, height: 80, seats: 5, shape: 'rectangle', label: 'T7', status: 'available' },
        { id: 'T8', x: 170, y: 280, width: 100, height: 80, seats: 5, shape: 'rectangle', label: 'T8', status: 'available' },
        { id: 'T9', x: 290, y: 280, width: 90, height: 80, seats: 4, shape: 'rectangle', label: 'T9', status: 'available' },
        
        // Back row - 5 tables (T10-T14)
        { id: 'T10', x: 30, y: 380, width: 70, height: 50, seats: 2, shape: 'rectangle', label: 'T10', status: 'available' },
        { id: 'T11', x: 120, y: 380, width: 70, height: 50, seats: 2, shape: 'rectangle', label: 'T11', status: 'available' },
        { id: 'T12', x: 210, y: 380, width: 70, height: 50, seats: 2, shape: 'rectangle', label: 'T12', status: 'available' },
        { id: 'T13', x: 300, y: 380, width: 70, height: 50, seats: 2, shape: 'rectangle', label: 'T13', status: 'available' },
        { id: 'T14', x: 390, y: 380, width: 70, height: 50, seats: 2, shape: 'rectangle', label: 'T14', status: 'available' }
      ];
      setTables(defaultTables);
    }
  }, [showTime]);

  // Save table layout - synchronized with TableAllocation
  const saveLayout = () => {
    try {
      localStorage.setItem(`table-allocation-state-v3-${showTime}`, JSON.stringify(tables));
      toast({
        title: "Layout Saved",
        description: "Table layout has been saved successfully"
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save table layout",
        variant: "destructive"
      });
    }
  };

  // Reset to default layout with 14 tables
  const resetToDefault = () => {
    localStorage.removeItem(`table-allocation-state-v3-${showTime}`);
    const defaultTables: Table[] = [
      // Front row - 3 tables (T1-T3)
      { id: 'T1', x: 50, y: 100, width: 80, height: 60, seats: 2, shape: 'rectangle', label: 'T1', status: 'available' },
      { id: 'T2', x: 150, y: 100, width: 80, height: 60, seats: 2, shape: 'rectangle', label: 'T2', status: 'available' },
      { id: 'T3', x: 250, y: 100, width: 80, height: 60, seats: 2, shape: 'rectangle', label: 'T3', status: 'available' },
      
      // Row 2 - 3 larger tables (T4-T6)
      { id: 'T4', x: 50, y: 180, width: 100, height: 80, seats: 5, shape: 'rectangle', label: 'T4', status: 'available' },
      { id: 'T5', x: 170, y: 180, width: 100, height: 80, seats: 5, shape: 'rectangle', label: 'T5', status: 'available' },
      { id: 'T6', x: 290, y: 180, width: 90, height: 80, seats: 4, shape: 'rectangle', label: 'T6', status: 'available' },
      
      // Row 3 - 3 larger tables (T7-T9)
      { id: 'T7', x: 50, y: 280, width: 100, height: 80, seats: 5, shape: 'rectangle', label: 'T7', status: 'available' },
      { id: 'T8', x: 170, y: 280, width: 100, height: 80, seats: 5, shape: 'rectangle', label: 'T8', status: 'available' },
      { id: 'T9', x: 290, y: 280, width: 90, height: 80, seats: 4, shape: 'rectangle', label: 'T9', status: 'available' },
      
      // Back row - 5 tables (T10-T14)
      { id: 'T10', x: 30, y: 380, width: 70, height: 50, seats: 2, shape: 'rectangle', label: 'T10', status: 'available' },
      { id: 'T11', x: 120, y: 380, width: 70, height: 50, seats: 2, shape: 'rectangle', label: 'T11', status: 'available' },
      { id: 'T12', x: 210, y: 380, width: 70, height: 50, seats: 2, shape: 'rectangle', label: 'T12', status: 'available' },
      { id: 'T13', x: 300, y: 380, width: 70, height: 50, seats: 2, shape: 'rectangle', label: 'T13', status: 'available' },
      { id: 'T14', x: 390, y: 380, width: 70, height: 50, seats: 2, shape: 'rectangle', label: 'T14', status: 'available' }
    ];
    setTables(defaultTables);
    toast({
      title: "Layout Reset",
      description: "Reset to default layout with 14 tables"
    });
  };

  // Export layout as JSON
  const exportLayout = () => {
    const dataStr = JSON.stringify(tables, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `seating-layout-${showTime}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Layout Exported",
      description: "Layout has been downloaded as JSON file"
    });
  };

  // Import layout from JSON file
  const importLayout = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedTables = JSON.parse(e.target?.result as string);
        setTables(importedTables);
        toast({
          title: "Layout Imported",
          description: "Table layout has been imported successfully"
        });
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Invalid JSON file format",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    event.target.value = '';
  };

  // Update tables with current guest assignments
  const tablesWithGuests = tables.map(table => {
    const assignedGuests = checkedInGuests.filter(guest => 
      guest.hasTableAllocated && 
      // This would need to be connected to actual table assignments
      // For now, we'll use a placeholder logic
      false
    );
    
    return {
      ...table,
      assignedGuests,
      status: assignedGuests.length > 0 ? 'occupied' as const : table.status
    };
  });

  const handleTableAssign = (tableId: string, guest: CheckedInGuest) => {
    onGuestTableAssign(guest.originalIndex, tableId);
    
    // Update table status
    setTables(prev => prev.map(table => {
      if (table.id === tableId) {
        return {
          ...table,
          status: 'occupied' as const
        };
      }
      return table;
    }));

    toast({
      title: "Guest Assigned",
      description: `${guest.name} has been assigned to ${tables.find(t => t.id === tableId)?.label}`
    });
  };

  const handleGuestMove = (guest: CheckedInGuest, fromTableId: string, toTableId: string) => {
    if (toTableId === '') {
      // Remove from table
      onGuestTableRemove(guest.originalIndex);
    } else {
      // Move to new table
      onGuestTableAssign(guest.originalIndex, toTableId);
    }
    
    toast({
      title: "Guest Moved",
      description: toTableId === '' 
        ? `${guest.name} has been unassigned`
        : `${guest.name} has been moved to ${tables.find(t => t.id === toTableId)?.label}`
    });
  };

  const handleTableClear = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table?.assignedGuests) return;

    table.assignedGuests.forEach(guest => {
      onGuestTableRemove(guest.originalIndex);
    });

    // Update table status
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        return { ...t, status: 'available' as const };
      }
      return t;
    }));

    toast({
      title: "Table Cleared",
      description: `All guests have been removed from ${table.label}`
    });
  };

  const stats = {
    totalTables: tables.length,
    totalSeats: tables.reduce((sum, t) => sum + t.seats, 0),
    checkedInGuests: checkedInGuests.length,
    assignedGuests: checkedInGuests.filter(g => g.hasTableAllocated).length,
    unassignedGuests: checkedInGuests.filter(g => !g.hasTableAllocated).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Seating Management</h2>
          <p className="text-muted-foreground">
            Design tables and assign guests for {showTime} show
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline">{stats.totalTables} tables</Badge>
          <Badge variant="outline">{stats.totalSeats} seats</Badge>
          <Badge variant="outline">{stats.assignedGuests}/{stats.checkedInGuests} assigned</Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalTables}</div>
            <div className="text-sm text-muted-foreground">Tables</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success">{stats.totalSeats}</div>
            <div className="text-sm text-muted-foreground">Total Seats</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-warning">{stats.assignedGuests}</div>
            <div className="text-sm text-muted-foreground">Assigned</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-destructive">{stats.unassignedGuests}</div>
            <div className="text-sm text-muted-foreground">Unassigned</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="seating" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Seating Chart
            </TabsTrigger>
            <TabsTrigger value="designer" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Table Designer
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={saveLayout}>
              <Save className="w-4 h-4 mr-2" />
              Save Layout
            </Button>
            <Button variant="outline" size="sm" onClick={resetToDefault}>
              Reset to 14 Tables
            </Button>
            <Button variant="outline" size="sm" onClick={exportLayout}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={importLayout}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            </div>
          </div>
        </div>

        <TabsContent value="seating" className="space-y-6">
          <SeatingChart
            tables={tablesWithGuests}
            checkedInGuests={checkedInGuests}
            onTableAssign={handleTableAssign}
            onGuestMove={handleGuestMove}
            onTableClear={handleTableClear}
            friendshipGroups={friendshipGroups}
            onAddWalkIn={onAddWalkIn}
            showTimes={showTimes}
          />
        </TabsContent>

        <TabsContent value="designer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Table Layout Designer</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <TableDesigner
                tables={tables}
                onTablesChange={setTables}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};