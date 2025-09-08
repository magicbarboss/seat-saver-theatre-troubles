import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, Save, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
}

interface TableDesignerProps {
  tables: Table[];
  onTablesChange: (tables: Table[]) => void;
  readonly?: boolean;
}

export const TableDesigner: React.FC<TableDesignerProps> = ({
  tables,
  onTablesChange,
  readonly = false
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTable, setNewTable] = useState<{
    seats: number;
    shape: 'rectangle' | 'circle';
    label: string;
  }>({
    seats: 4,
    shape: 'rectangle',
    label: ''
  });

  const handleTableClick = (tableId: string, event: React.MouseEvent) => {
    if (readonly) return;
    
    event.stopPropagation();
    setSelectedTable(selectedTable === tableId ? null : tableId);
  };

  const handleMouseDown = (tableId: string, event: React.MouseEvent) => {
    if (readonly) return;
    
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    setIsDragging(true);
    setSelectedTable(tableId);
    setDragOffset({
      x: event.clientX - table.x,
      y: event.clientY - table.y
    });
  };

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging || !selectedTable || readonly) return;

    const newTables = tables.map(table => {
      if (table.id === selectedTable) {
        return {
          ...table,
          x: Math.max(0, event.clientX - dragOffset.x),
          y: Math.max(0, event.clientY - dragOffset.y)
        };
      }
      return table;
    });

    onTablesChange(newTables);
  }, [isDragging, selectedTable, dragOffset, tables, onTablesChange, readonly]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const addTable = () => {
    const newTableData: Table = {
      id: `table-${Date.now()}`,
      x: 100,
      y: 100,
      width: newTable.shape === 'circle' ? 80 : 120,
      height: newTable.shape === 'circle' ? 80 : 80,
      seats: newTable.seats,
      shape: newTable.shape,
      label: newTable.label || `Table ${tables.length + 1}`,
      status: 'available'
    };

    onTablesChange([...tables, newTableData]);
    setShowAddDialog(false);
    setNewTable({ seats: 4, shape: 'rectangle', label: '' });
    
    toast({
      title: "Table Added",
      description: `${newTableData.label} has been added to the layout`
    });
  };

  const deleteTable = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    onTablesChange(tables.filter(t => t.id !== tableId));
    setSelectedTable(null);
    
    toast({
      title: "Table Removed",
      description: `${table?.label} has been removed from the layout`
    });
  };

  const updateSelectedTable = (updates: Partial<Table>) => {
    if (!selectedTable) return;

    const newTables = tables.map(table => {
      if (table.id === selectedTable) {
        return { ...table, ...updates };
      }
      return table;
    });

    onTablesChange(newTables);
  };

  const resetLayout = () => {
    onTablesChange([]);
    setSelectedTable(null);
    
    toast({
      title: "Layout Reset",
      description: "All tables have been removed from the layout"
    });
  };

  const getTableStatusColor = (status: Table['status']) => {
    switch (status) {
      case 'available': return 'bg-success/20 border-success';
      case 'occupied': return 'bg-destructive/20 border-destructive';
      case 'reserved': return 'bg-warning/20 border-warning';
      case 'disabled': return 'bg-muted border-muted-foreground';
      default: return 'bg-muted border-border';
    }
  };

  const selectedTableData = tables.find(t => t.id === selectedTable);

  return (
    <div className="flex gap-4 h-full">
      {/* Canvas Area */}
      <div className="flex-1 border border-border rounded-lg bg-background relative overflow-hidden">
        <div 
          ref={canvasRef}
          className="relative w-full h-full min-h-[500px] min-w-[450px] cursor-crosshair"
          onClick={() => setSelectedTable(null)}
        >
          {tables.map(table => (
            <div
              key={table.id}
              className={`absolute border-2 flex items-center justify-center text-sm font-medium cursor-pointer transition-all duration-200 ${
                getTableStatusColor(table.status)
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
              onClick={(e) => handleTableClick(table.id, e)}
              onMouseDown={(e) => handleMouseDown(table.id, e)}
            >
              <div className="text-center">
                <div className="font-semibold">{table.label}</div>
                <div className="text-xs text-muted-foreground">{table.seats} seats</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Control Panel */}
      <div className="w-80 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Table Designer
              <Badge variant="secondary">{tables.length} tables</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!readonly && (
              <>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Table
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Table</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="label">Table Label</Label>
                        <Input
                          id="label"
                          placeholder="e.g., Table 1, VIP Table"
                          value={newTable.label}
                          onChange={(e) => setNewTable(prev => ({ ...prev, label: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="seats">Number of Seats</Label>
                        <Input
                          id="seats"
                          type="number"
                          min="1"
                          max="20"
                          value={newTable.seats}
                          onChange={(e) => setNewTable(prev => ({ ...prev, seats: parseInt(e.target.value) || 4 }))}
                        />
                      </div>
                      <div>
                        <Label>Table Shape</Label>
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant={newTable.shape === 'rectangle' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setNewTable(prev => ({ ...prev, shape: 'rectangle' }))}
                          >
                            Rectangle
                          </Button>
                          <Button
                            variant={newTable.shape === 'circle' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setNewTable(prev => ({ ...prev, shape: 'circle' }))}
                          >
                            Circle
                          </Button>
                        </div>
                      </div>
                      <Button onClick={addTable} className="w-full">
                        Add Table
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={resetLayout}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Selected Table Properties */}
        {selectedTableData && !readonly && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Table Properties
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteTable(selectedTableData.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="edit-label">Label</Label>
                <Input
                  id="edit-label"
                  value={selectedTableData.label}
                  onChange={(e) => updateSelectedTable({ label: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-seats">Seats</Label>
                <Input
                  id="edit-seats"
                  type="number"
                  min="1"
                  max="20"
                  value={selectedTableData.seats}
                  onChange={(e) => updateSelectedTable({ seats: parseInt(e.target.value) || 4 })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(['available', 'occupied', 'reserved', 'disabled'] as const).map(status => (
                    <Button
                      key={status}
                      variant={selectedTableData.status === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSelectedTable({ status })}
                      className="capitalize"
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};