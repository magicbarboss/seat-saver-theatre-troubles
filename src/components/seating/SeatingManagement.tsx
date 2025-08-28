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
}

export const SeatingManagement: React.FC<SeatingManagementProps> = ({
  checkedInGuests,
  onGuestTableAssign,
  onGuestTableRemove,
  showTime,
  friendshipGroups
}) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [activeTab, setActiveTab] = useState('seating');

  // Load saved table layout
  useEffect(() => {
    const savedLayout = localStorage.getItem(`seating-layout-${showTime}`);
    if (savedLayout) {
      try {
        const parsedLayout = JSON.parse(savedLayout);
        setTables(parsedLayout);
      } catch (error) {
        console.error('Failed to load saved layout:', error);
      }
    } else {
      // Default layout with some example tables including a 2-seat back row table
      const defaultTables: Table[] = [
        {
          id: 'table-front-1',
          x: 100,
          y: 150,
          width: 120,
          height: 80,
          seats: 4,
          shape: 'rectangle',
          label: 'Table 1',
          status: 'available'
        },
        {
          id: 'table-front-2',
          x: 250,
          y: 150,
          width: 120,
          height: 80,
          seats: 4,
          shape: 'rectangle',
          label: 'Table 2',
          status: 'available'
        },
        {
          id: 'table-middle-1',
          x: 100,
          y: 270,
          width: 120,
          height: 80,
          seats: 6,
          shape: 'rectangle',
          label: 'Table 3',
          status: 'available'
        },
        {
          id: 'table-middle-2',
          x: 250,
          y: 270,
          width: 120,
          height: 80,
          seats: 6,
          shape: 'rectangle',
          label: 'Table 4',
          status: 'available'
        },
        {
          id: 'table-back-row',
          x: 175,
          y: 390,
          width: 100,
          height: 60,
          seats: 2,
          shape: 'rectangle',
          label: 'Back Row',
          status: 'available'
        }
      ];
      setTables(defaultTables);
    }
  }, [showTime]);

  // Save table layout
  const saveLayout = () => {
    try {
      localStorage.setItem(`seating-layout-${showTime}`, JSON.stringify(tables));
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