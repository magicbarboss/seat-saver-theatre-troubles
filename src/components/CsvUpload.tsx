import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { extractShowTimeFromText, normalizeShowTime, isValidShowTime } from '@/utils/showTimeExtractor';

interface ProcessedGuest {
  booking_code?: string;
  booker_name?: string;
  total_quantity?: number;
  show_time?: string;
  item_details?: string;
  notes?: string;
  booking_comments?: string;
  ticket_data?: Record<string, any>;
  original_row_index?: number;
}

interface GuestList {
  id: string;
  name: string;
  uploaded_at: string;
  uploaded_by: string;
  is_active: boolean;
}

interface CsvUploadProps {
  onGuestListCreated?: (guestList: GuestList) => void;
}

const CsvUpload: React.FC<CsvUploadProps> = ({ onGuestListCreated }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [guestListName, setGuestListName] = useState('');
  const { user } = useAuth();

  const detectColumns = (headers: string[]) => {
    const columnMapping: Record<string, number> = {};
    
    headers.forEach((header, index) => {
      const normalizedHeader = header?.toLowerCase().trim() || '';
      
      if (normalizedHeader.includes('booking') && normalizedHeader.includes('code')) {
        columnMapping.booking_code = index;
      } else if (normalizedHeader.includes('booker') || normalizedHeader.includes('name')) {
        columnMapping.booker_name = index;
      } else if (normalizedHeader.includes('quantity') || normalizedHeader.includes('guests')) {
        columnMapping.total_quantity = index;
      } else if (normalizedHeader.includes('show') && normalizedHeader.includes('time')) {
        columnMapping.show_time = index;
      } else if (normalizedHeader.includes('item') || normalizedHeader.includes('details')) {
        columnMapping.item_details = index;
      } else if (normalizedHeader.includes('note')) {
        columnMapping.notes = index;
      }
    });
    
    return columnMapping;
  };

  const extractTicketData = useCallback((row: any[], headers: string[]): Record<string, any> => {
    const ticketData: Record<string, any> = {};
    
    headers.forEach((header, index) => {
      if (header && row[index] !== undefined && row[index] !== null && row[index] !== '') {
        // Skip the "Total" column as requested
        if (header.toLowerCase().includes('total') && header.toLowerCase().includes('$')) {
          return;
        }
        ticketData[header] = row[index];
      }
    });
    
    return ticketData;
  }, []);

  const processGuestShowTime = useCallback((guest: ProcessedGuest): ProcessedGuest => {
    // If show_time is already populated and valid, keep it
    if (guest.show_time && isValidShowTime(guest.show_time)) {
      guest.show_time = normalizeShowTime(guest.show_time);
      return guest;
    }
    
    // Try to extract show time from item_details
    if (guest.item_details) {
      const extractedTime = extractShowTimeFromText(guest.item_details);
      if (extractedTime) {
        guest.show_time = extractedTime;
        console.log(`📅 Extracted show time "${extractedTime}" from item details: "${guest.item_details}"`);
      }
    }
    
    // Try to extract from any other text fields as fallback
    if (!guest.show_time) {
      const fieldsToCheck = [guest.notes, guest.booking_comments];
      for (const field of fieldsToCheck) {
        if (field) {
          const extractedTime = extractShowTimeFromText(field);
          if (extractedTime) {
            guest.show_time = extractedTime;
            console.log(`📅 Extracted show time "${extractedTime}" from field: "${field}"`);
            break;
          }
        }
      }
    }
    
    return guest;
  }, []);

  const processExcelFile = useCallback(async (file: File) => {
    return new Promise<ProcessedGuest[]>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to array of arrays
          const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            raw: false,
            defval: '' 
          });
          
          console.log('📊 Raw Excel data:', jsonData.slice(0, 10));
          
          if (jsonData.length < 5) {
            throw new Error('Excel file must have at least 5 rows (including headers in row 4)');
          }
          
          // Use row 4 (index 3) as headers as requested
          const headerRowIndex = 3;
          const headers = jsonData[headerRowIndex] || [];
          
          console.log('📋 Headers from row 4:', headers);
          
          // Filter out "Total" column from headers and processing
          const filteredHeaders = headers.filter((header: string) => 
            !header?.toLowerCase().includes('total') || 
            !header?.toLowerCase().includes('$')
          );
          
          console.log('📋 Filtered headers (no Total):', filteredHeaders);
          
          if (filteredHeaders.length === 0) {
            throw new Error('No valid headers found in row 4. Please check your Excel file format.');
          }
          
          // Detect column mappings using filtered headers
          const columnMapping = detectColumns(filteredHeaders);
          console.log('🗺️ Column mapping:', columnMapping);
          
          // Process data rows starting from row 5 (index 4)
          const dataRows = jsonData.slice(4).filter(row => 
            row && row.length > 0 && row.some((cell: any) => cell !== null && cell !== undefined && cell !== '')
          );
          
          console.log(`📊 Processing ${dataRows.length} data rows`);
          
          const processedGuests: ProcessedGuest[] = dataRows.map((row, index) => {
            // Create filtered row that corresponds to filtered headers
            const filteredRow: any[] = [];
            headers.forEach((header: string, headerIndex: number) => {
              if (!header?.toLowerCase().includes('total') || !header?.toLowerCase().includes('$')) {
                filteredRow.push(row[headerIndex]);
              }
            });
            
            const guest: ProcessedGuest = {
              original_row_index: index,
              ticket_data: extractTicketData(row, headers)
            };
            
            // Map the detected columns to guest properties
            Object.entries(columnMapping).forEach(([field, colIndex]) => {
              const value = filteredRow[colIndex];
              if (value !== undefined && value !== null && value !== '') {
                if (field === 'total_quantity') {
                  // Ensure total_quantity is a number
                  const numValue = typeof value === 'string' ? parseInt(value, 10) : Number(value);
                  if (!isNaN(numValue) && numValue > 0) {
                    guest.total_quantity = numValue;
                  } else {
                    guest.total_quantity = 1; // Default to 1 if invalid
                  }
                } else {
                  // Type-safe assignment for other fields
                  switch (field) {
                    case 'booking_code':
                      guest.booking_code = String(value);
                      break;
                    case 'booker_name':
                      guest.booker_name = String(value);
                      break;
                    case 'show_time':
                      guest.show_time = String(value);
                      break;
                    case 'item_details':
                      guest.item_details = String(value);
                      break;
                    case 'notes':
                      guest.notes = String(value);
                      break;
                    case 'booking_comments':
                      guest.booking_comments = String(value);
                      break;
                  }
                }
              }
            });
            
            // Process show time extraction after all fields are populated
            const processedGuest = processGuestShowTime(guest);
            
            return processedGuest;
          }).filter(guest => 
            guest.booker_name || guest.booking_code || Object.keys(guest.ticket_data || {}).length > 0
          );
          
          console.log(`✅ Successfully processed ${processedGuests.length} guests from Excel`);
          console.log('👥 Sample processed guests with show times:', processedGuests.slice(0, 3));
          
          resolve(processedGuests);
        } catch (error) {
          console.error('❌ Error processing Excel file:', error);
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read Excel file'));
      reader.readAsArrayBuffer(file);
    });
  }, [extractTicketData, processGuestShowTime]);

  const processCsvFile = useCallback(async (file: File) => {
    return new Promise<ProcessedGuest[]>((resolve, reject) => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const rows = results.data as string[][];
            
            if (rows.length < 2) {
              throw new Error('CSV file must have at least 2 rows (header and data)');
            }
            
            const headers = rows[0];
            const columnMapping = detectColumns(headers);
            
            const processedGuests: ProcessedGuest[] = rows.slice(1).map((row, index) => {
              const guest: ProcessedGuest = {
                original_row_index: index,
                ticket_data: extractTicketData(row, headers)
              };
              
              Object.entries(columnMapping).forEach(([field, colIndex]) => {
                const value = row[colIndex];
                if (value && value.trim() !== '') {
                  if (field === 'total_quantity') {
                    const numValue = parseInt(value.trim(), 10);
                    guest.total_quantity = isNaN(numValue) ? 1 : numValue;
                  } else {
                    // Type-safe assignment for other fields
                    switch (field) {
                      case 'booking_code':
                        guest.booking_code = value.trim();
                        break;
                      case 'booker_name':
                        guest.booker_name = value.trim();
                        break;
                      case 'show_time':
                        guest.show_time = value.trim();
                        break;
                      case 'item_details':
                        guest.item_details = value.trim();
                        break;
                      case 'notes':
                        guest.notes = value.trim();
                        break;
                      case 'booking_comments':
                        guest.booking_comments = value.trim();
                        break;
                    }
                  }
                }
              });
              
              // Process show time extraction after all fields are populated
              const processedGuest = processGuestShowTime(guest);
              
              return processedGuest;
            }).filter(guest => guest.booker_name || guest.booking_code);
            
            console.log(`✅ Successfully processed ${processedGuests.length} guests from CSV`);
            console.log('👥 Sample processed guests with show times:', processedGuests.slice(0, 3));
            
            resolve(processedGuests);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => reject(error)
      });
    });
  }, [extractTicketData, processGuestShowTime]);

  const uploadGuests = async (guests: ProcessedGuest[]) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    const { data: guestList, error: listError } = await supabase
      .from('guest_lists')
      .insert({
        uploaded_by: user.id,
        name: guestListName || `Guest List ${new Date().toLocaleDateString()}`
      })
      .select()
      .single();

    if (listError) throw listError;

    const guestsWithListId = guests.map(guest => ({
      ...guest,
      guest_list_id: guestList.id
    }));

    const { error: guestsError } = await supabase
      .from('guests')
      .insert(guestsWithListId);

    if (guestsError) throw guestsError;

    return guestList;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV or Excel file",
          variant: "destructive"
        });
        return;
      }
      setFile(selectedFile);
      setUploadComplete(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !user?.id) return;

    setUploading(true);
    try {
      let guests: ProcessedGuest[];
      
      if (file.name.endsWith('.csv')) {
        guests = await processCsvFile(file);
      } else {
        guests = await processExcelFile(file);
      }

      if (guests.length === 0) {
        throw new Error('No valid guest data found in the file');
      }

      const guestList = await uploadGuests(guests);
      
      setUploadComplete(true);
      toast({
        title: "Upload successful",
        description: `Successfully uploaded ${guests.length} guests`
      });

      // Call the callback if provided
      if (onGuestListCreated) {
        onGuestListCreated(guestList);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Upload Guest List
        </CardTitle>
        <CardDescription>
          Upload a CSV or Excel file containing guest information. For Excel files, headers should be in row 4.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="guest-list-name">Guest List Name (Optional)</Label>
          <Input
            id="guest-list-name"
            placeholder="Enter a name for this guest list..."
            value={guestListName}
            onChange={(e) => setGuestListName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="file-upload">Choose File</Label>
          <Input
            id="file-upload"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </div>

        {file && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="text-sm">{file.name}</span>
            {uploadComplete && <CheckCircle className="h-4 w-4 text-green-600" />}
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!file || uploading || uploadComplete}
          className="w-full"
        >
          {uploading ? (
            "Uploading..."
          ) : uploadComplete ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Upload Complete
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Guest List
            </>
          )}
        </Button>

        {uploadComplete && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-800">
              Guest list uploaded successfully! You can now proceed to check-in guests.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CsvUpload;
