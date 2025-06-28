import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Users, Download, Settings, CheckCircle } from "lucide-react";
import * as XLSX from 'xlsx';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CheckInSystem from './CheckInSystem';
import TableAllocation from './TableAllocation';

interface Guest {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  table?: string;
  checkedIn: boolean;
  checkInTime?: string;
}

interface TableData {
  table: string;
  capacity: number;
  guests: Guest[];
}

const GuestManager = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showTableAllocation, setShowTableAllocation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const guestData: Guest[] = jsonData.map((row: any, index) => ({
        id: `guest-${index}`,
        name: row.Name || row.name || `Guest ${index + 1}`,
        email: row.Email || row.email || '',
        phone: row.Phone || row.phone || '',
        table: row.Table || row.table || '',
        checkedIn: false,
      }));

      setGuests(guestData);
      
      // Save to Supabase
      if (user) {
        const { error } = await supabase
          .from('guests')
          .upsert(guestData.map(guest => ({
            ...guest,
            user_id: user.id
          })));

        if (error) {
          console.error('Error saving guests:', error);
          toast({
            title: "Warning",
            description: "Guests loaded but not saved to database",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Success",
        description: `Loaded ${guestData.length} guests from CSV`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to parse CSV file",
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = () => {
    const template = [
      { Name: "John Doe", Email: "john@example.com", Phone: "123-456-7890", Table: "A1" },
      { Name: "Jane Smith", Email: "jane@example.com", Phone: "098-765-4321", Table: "A2" },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Guest List");
    XLSX.writeFile(wb, "guest_list_template.xlsx");
  };

  const exportGuestList = () => {
    if (guests.length === 0) {
      toast({
        title: "No Data",
        description: "No guests to export",
        variant: "destructive",
      });
      return;
    }

    const ws = XLSX.utils.json_to_sheet(guests);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Guest List");
    XLSX.writeFile(wb, "guest_list_export.xlsx");
  };

  const updateGuestCheckIn = (guestId: string, checkedIn: boolean) => {
    setGuests(prev => prev.map(guest => 
      guest.id === guestId 
        ? { ...guest, checkedIn, checkInTime: checkedIn ? new Date().toISOString() : undefined }
        : guest
    ));
  };

  const updateGuestTable = (guestId: string, table: string) => {
    setGuests(prev => prev.map(guest => 
      guest.id === guestId ? { ...guest, table } : guest
    ));
  };

  const getTableData = (): TableData[] => {
    const tables = new Map<string, TableData>();
    
    guests.forEach(guest => {
      const tableName = guest.table || 'Unassigned';
      if (!tables.has(tableName)) {
        tables.set(tableName, {
          table: tableName,
          capacity: 8, // Default capacity
          guests: []
        });
      }
      tables.get(tableName)!.guests.push(guest);
    });

    return Array.from(tables.values());
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Theatre Seating System</h1>
          <p className="text-xl text-muted-foreground">Manage your guest list and seating arrangements</p>
        </div>

        {/* Quick Actions Section - moved to top */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Access frequently used tools and features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button 
                  onClick={() => setShowCheckIn(true)}
                  className="flex items-center gap-2"
                  size="lg"
                >
                  <CheckCircle className="h-5 w-5" />
                  Open Check-in System
                </Button>
                {guests.length > 0 && (
                  <Button 
                    onClick={() => setShowTableAllocation(true)}
                    variant="outline"
                    className="flex items-center gap-2"
                    size="lg"
                  >
                    <Users className="h-5 w-5" />
                    Table Allocation
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Existing content */}
        {!showCheckIn && !showTableAllocation && (
          <>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Guest List
                  </CardTitle>
                  <CardDescription>
                    Upload a CSV or Excel file with your guest information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                  />
                  <div className="space-y-4">
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      Choose File
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={downloadTemplate}
                      className="w-full"
                    >
                      Download Template
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Export Data
                  </CardTitle>
                  <CardDescription>
                    Download your current guest list and check-in status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={exportGuestList}
                    className="w-full"
                    disabled={guests.length === 0}
                  >
                    Export Guest List
                  </Button>
                </CardContent>
              </Card>
            </div>

            {guests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Guest List ({guests.length} guests)
                  </CardTitle>
                  <CardDescription>
                    {guests.filter(g => g.checkedIn).length} checked in, {guests.filter(g => !g.checkedIn).length} pending
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Name</th>
                          <th className="text-left p-2">Email</th>
                          <th className="text-left p-2">Phone</th>
                          <th className="text-left p-2">Table</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {guests.map((guest) => (
                          <tr key={guest.id} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{guest.name}</td>
                            <td className="p-2 text-muted-foreground">{guest.email}</td>
                            <td className="p-2 text-muted-foreground">{guest.phone}</td>
                            <td className="p-2">{guest.table || 'Unassigned'}</td>
                            <td className="p-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                guest.checkedIn 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {guest.checkedIn ? 'Checked In' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {showCheckIn && (
          <CheckInSystem 
            guests={guests}
            onUpdateGuest={updateGuestCheckIn}
            onClose={() => setShowCheckIn(false)}
          />
        )}

        {showTableAllocation && (
          <TableAllocation 
            tables={getTableData()}
            onUpdateGuestTable={updateGuestTable}
            onClose={() => setShowTableAllocation(false)}
          />
        )}
      </div>
    </div>
  );
};

export default GuestManager;
