
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

// FIXED: Date extraction utility function with proper debugging and month handling
const extractDateFromFilename = (filename: string): Date | null => {
  const cleanName = filename.replace(/\.(csv|xlsx)$/i, '');
  console.log(`🔍 Extracting date from filename: "${filename}" -> cleaned: "${cleanName}"`);
  
  // Pattern 1: "July 26 2025" or "July 26, 2025" - FIXED: Use Date constructor properly
  const monthNamePattern = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i;
  const monthNameMatch = cleanName.match(monthNamePattern);
  if (monthNameMatch) {
    const [, monthName, day, year] = monthNameMatch;
    console.log(`🔍 Month name extraction: month="${monthName}", day="${day}", year="${year}"`);
    
    // FIXED: Create date using the proper Date constructor
    // Format: "Month DD, YYYY" - this ensures correct parsing
    const dateString = `${monthName} ${day}, ${year}`;
    const extractedDate = new Date(dateString);
    
    console.log(`✅ Extracted date using month name pattern: "${dateString}" -> ${extractedDate.toDateString()}`);
    console.log(`📅 Date components: Year=${extractedDate.getFullYear()}, Month=${extractedDate.getMonth() + 1}, Day=${extractedDate.getDate()}`);
    
    // Validate the date is valid
    if (!isNaN(extractedDate.getTime())) {
      return extractedDate;
    } else {
      console.log(`❌ Invalid date created from: "${dateString}"`);
    }
  }
  
  // Pattern 2: DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyyPattern = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/;
  const ddmmyyyyMatch = cleanName.match(ddmmyyyyPattern);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    const extractedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    console.log(`✅ Extracted date using DD/MM/YYYY pattern: ${day}/${month}/${year} -> ${extractedDate.toDateString()}`);
    
    if (!isNaN(extractedDate.getTime())) {
      return extractedDate;
    }
  }
  
  // Pattern 3: YYYY-MM-DD
  const yyyymmddPattern = /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/;
  const yyyymmddMatch = cleanName.match(yyyymmddPattern);
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch;
    const extractedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    console.log(`✅ Extracted date using YYYY-MM-DD pattern: ${year}-${month}-${day} -> ${extractedDate.toDateString()}`);
    
    if (!isNaN(extractedDate.getTime())) {
      return extractedDate;
    }
  }
  
  console.log(`❌ No date pattern matched for: "${cleanName}"`);
  return null;
};

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
        // More precise filtering: keep quantity totals but exclude price totals
        if (header.toLowerCase().includes('total') && 
            (header.toLowerCase().includes('$') || header.toLowerCase().includes('price') || header.toLowerCase().includes('cost'))) {
          return;
        }
        ticketData[header] = row[index];
      }
    });
    
    return ticketData;
  }, []);

  const calculateTotalQuantityFromTicketData = useCallback((ticketData: Record<string, any>): number => {
    console.log('🔢 Calculating total quantity from ticket data:', ticketData);
    
    // First, look for a "Total Quantity" field in ticket data
    for (const [key, value] of Object.entries(ticketData)) {
      const normalizedKey = key.toLowerCase();
      if ((normalizedKey.includes('total') && normalizedKey.includes('quantity')) ||
          (normalizedKey.includes('total') && normalizedKey.includes('guests')) ||
          normalizedKey === 'total quantity' ||
          normalizedKey === 'total guests') {
        const numValue = typeof value === 'string' ? parseInt(value, 10) : Number(value);
        if (!isNaN(numValue) && numValue > 0) {
          console.log(`✅ Found total quantity field "${key}": ${numValue}`);
          return numValue;
        }
      }
    }
    
    // Second, sum up all numeric values that represent ticket quantities
    let totalQuantity = 0;
    const quantityFields: string[] = [];
    
    for (const [key, value] of Object.entries(ticketData)) {
      const normalizedKey = key.toLowerCase();
      
      // Skip fields that are likely not quantities
      if (normalizedKey.includes('$') || 
          normalizedKey.includes('price') || 
          normalizedKey.includes('cost') || 
          normalizedKey.includes('code') ||
          normalizedKey.includes('name') ||
          normalizedKey.includes('time') ||
          normalizedKey.includes('date')) {
        continue;
      }
      
      // Try to parse as number
      const numValue = typeof value === 'string' ? parseInt(value, 10) : Number(value);
      if (!isNaN(numValue) && numValue > 0) {
        // Check if this looks like a ticket quantity field
        if (normalizedKey.includes('ticket') || 
            normalizedKey.includes('seat') || 
            normalizedKey.includes('admission') ||
            normalizedKey.includes('quantity') ||
            normalizedKey.includes('guests') ||
            /^\d+$/.test(String(value))) { // Just a number
          totalQuantity += numValue;
          quantityFields.push(`${key}: ${numValue}`);
        }
      }
    }
    
    if (totalQuantity > 0) {
      console.log(`✅ Calculated total quantity by summing fields [${quantityFields.join(', ')}]: ${totalQuantity}`);
      return totalQuantity;
    }
    
    console.log('⚠️ No quantity fields found in ticket data, defaulting to 1');
    return 1;
  }, []);

  const extractQuantityFromText = useCallback((text: string): number => {
    if (!text) return 0;
    
    // Look for patterns like "x2", "2 tickets", "qty: 3", etc.
    const patterns = [
      /x(\d+)/i,
      /(\d+)\s*tickets?/i,
      /qty:?\s*(\d+)/i,
      /quantity:?\s*(\d+)/i,
      /(\d+)\s*guests?/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > 0) {
          console.log(`📝 Extracted quantity ${num} from text: "${text}"`);
          return num;
        }
      }
    }
    
    return 0;
  }, []);

  const processGuestShowTime = useCallback((guest: ProcessedGuest, eventDate?: Date): ProcessedGuest => {
    // If show_time is already populated and valid, keep it
    if (guest.show_time && isValidShowTime(guest.show_time)) {
      guest.show_time = normalizeShowTime(guest.show_time);
    } else {
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
    }

    // Check if this is a Viator booking using ticket_data.Status
    const isViatorBooking = guest.ticket_data?.Status === 'VIATOR';
    
    if (isViatorBooking && eventDate) {
      const dayOfWeek = eventDate.getDay(); // 0 = Sunday, 4 = Thursday, 5 = Friday, 6 = Saturday
      
      console.log(`📅 FIXED Viator booking detected for "${guest.booker_name}":
        - Event date: ${eventDate.toDateString()} 
        - Day of week: ${dayOfWeek} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]})
        - Total quantity: ${guest.total_quantity}
        - Current item_details: "${guest.item_details}"`);
      
      // CONFIRMED: Only Thursday (day 4) gets prosecco package
      if (dayOfWeek === 4) {
        // Prosecco package: 1 prosecco per person, 1 pizza + 1 fries per couple
        const proseccoCount = guest.total_quantity || 1;
        const coupleCount = Math.ceil(proseccoCount / 2);
        
        guest.item_details = `${proseccoCount} x Prosecco, ${coupleCount} x Pizza, ${coupleCount} x Fries`;
        guest.notes = guest.notes ? `${guest.notes} | Viator Prosecco Package` : 'Viator Prosecco Package';
        console.log(`🍾 Applied Viator Prosecco Package (Thursday): ${guest.item_details}`);
      } else {
        // Friday (5) or Saturday (6) - show only
        guest.item_details = 'Show Only';
        guest.notes = guest.notes ? `${guest.notes} | Viator Show Only` : 'Viator Show Only';
        console.log(`🎭 Applied Viator Show Only (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]}): ${guest.item_details}`);
      }
    } else if (isViatorBooking && !eventDate) {
      console.log(`⚠️ Viator booking found but no event date available for "${guest.booker_name}" - cannot apply day-specific logic`);
    }
    
    return guest;
  }, []);

  const processGuestTotalQuantity = useCallback((guest: ProcessedGuest): ProcessedGuest => {
    // If total_quantity is missing, 1, or seems incorrect, try to calculate it
    const needsQuantityCalculation = !guest.total_quantity || guest.total_quantity === 1;
    
    if (needsQuantityCalculation && guest.ticket_data && Object.keys(guest.ticket_data).length > 0) {
      console.log(`🔍 Guest "${guest.booker_name || 'Unknown'}" needs quantity calculation. Current: ${guest.total_quantity}`);
      
      // Try to calculate from ticket data
      const calculatedQuantity = calculateTotalQuantityFromTicketData(guest.ticket_data);
      
      if (calculatedQuantity > 1) {
        const oldQuantity = guest.total_quantity;
        guest.total_quantity = calculatedQuantity;
        console.log(`✅ Updated total_quantity for "${guest.booker_name || 'Unknown'}" from ${oldQuantity} to ${calculatedQuantity}`);
      }
    }
    
    // Fallback: try to extract from text fields
    if ((!guest.total_quantity || guest.total_quantity === 1) && 
        (guest.item_details || guest.notes || guest.booking_comments)) {
      const fieldsToCheck = [guest.item_details, guest.notes, guest.booking_comments];
      for (const field of fieldsToCheck) {
        if (field) {
          const extractedQuantity = extractQuantityFromText(field);
          if (extractedQuantity > 1) {
            const oldQuantity = guest.total_quantity;
            guest.total_quantity = extractedQuantity;
            console.log(`✅ Extracted total_quantity ${extractedQuantity} for "${guest.booker_name || 'Unknown'}" from text field: "${field}"`);
            break;
          }
        }
      }
    }
    
    // Ensure we always have a valid quantity
    if (!guest.total_quantity || guest.total_quantity < 1) {
      guest.total_quantity = 1;
    }
    
    return guest;
  }, [calculateTotalQuantityFromTicketData, extractQuantityFromText]);

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
          
          // Improved filtering: keep quantity totals but exclude price totals
          const filteredHeaders = headers.filter((header: string) => {
            if (!header) return false;
            const normalizedHeader = header.toLowerCase();
            // Exclude only price/cost totals, keep quantity totals
            return !(normalizedHeader.includes('total') && 
                    (normalizedHeader.includes('$') || 
                     normalizedHeader.includes('price') || 
                     normalizedHeader.includes('cost')));
          });
          
          console.log('📋 Filtered headers (no price totals):', filteredHeaders);
          
          if (filteredHeaders.length === 0) {
            throw new Error('No valid headers found in row 4. Please check your Excel file format.');
          }
          
          // Detect column mappings using original headers (not filtered)
          const columnMapping = detectColumns(headers);
          console.log('🗺️ Column mapping:', columnMapping);
          
          // Process data rows starting from row 5 (index 4)
          const dataRows = jsonData.slice(4).filter(row => 
            row && row.length > 0 && row.some((cell: any) => cell !== null && cell !== undefined && cell !== '')
          );
          
          console.log(`📊 Processing ${dataRows.length} data rows`);
          
          // FIXED: Extract event date from filename with improved logic
          const eventDate = extractDateFromFilename(file.name);
          console.log(`📅 FIXED - Final extracted event date from filename "${file.name}":`, {
            date: eventDate?.toDateString() || 'None',
            dayOfWeek: eventDate ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][eventDate.getDay()] : 'N/A',
            isoString: eventDate?.toISOString() || 'N/A'
          });
          
          const processedGuests: ProcessedGuest[] = dataRows.map((row, index) => {
            const guest: ProcessedGuest = {
              original_row_index: index,
              ticket_data: extractTicketData(row, headers)
            };
            
            // Map the detected columns to guest properties
            Object.entries(columnMapping).forEach(([field, colIndex]) => {
              const value = row[colIndex];
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
            
            // Process show time extraction and Viator logic using FIXED event date
            let processedGuest = processGuestShowTime(guest, eventDate || undefined);
            
            // Process total quantity calculation after all fields are populated
            processedGuest = processGuestTotalQuantity(processedGuest);
            
            return processedGuest;
          }).filter(guest => 
            guest.booker_name || guest.booking_code || Object.keys(guest.ticket_data || {}).length > 0
          );
          
          console.log(`✅ Successfully processed ${processedGuests.length} guests from Excel`);
          console.log('👥 Sample processed guests with show times and quantities:', processedGuests.slice(0, 3));
          
          // Log summary of Viator bookings with FIXED date logic
          const viatorGuests = processedGuests.filter(g => g.ticket_data?.Status === 'VIATOR');
          console.log(`🎭 FIXED - Found ${viatorGuests.length} Viator bookings with correct date logic:`, 
            viatorGuests.map(g => `${g.booker_name} (${g.booking_code}): ${g.item_details}`));
          
          resolve(processedGuests);
        } catch (error) {
          console.error('❌ Error processing Excel file:', error);
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read Excel file'));
      reader.readAsArrayBuffer(file);
    });
  }, [extractTicketData, processGuestShowTime, processGuestTotalQuantity]);

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
            
            // FIXED: Extract event date from filename
            const eventDate = extractDateFromFilename(file.name);
            console.log(`📅 FIXED - Extracted event date from CSV filename "${file.name}":`, {
              date: eventDate?.toDateString() || 'None',
              dayOfWeek: eventDate ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][eventDate.getDay()] : 'N/A'
            });
            
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
              
              // Process show time extraction and Viator logic using FIXED event date
              let processedGuest = processGuestShowTime(guest, eventDate || undefined);
              
              // Process total quantity calculation after all fields are populated
              processedGuest = processGuestTotalQuantity(processedGuest);
              
              return processedGuest;
            }).filter(guest => guest.booker_name || guest.booking_code);
            
            console.log(`✅ Successfully processed ${processedGuests.length} guests from CSV`);
            console.log('👥 Sample processed guests with show times and quantities:', processedGuests.slice(0, 3));
            
            resolve(processedGuests);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => reject(error)
      });
    });
  }, [extractTicketData, processGuestShowTime, processGuestTotalQuantity]);

  const uploadGuests = async (guests: ProcessedGuest[]) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    // Extract event date from filename if available
    const eventDate = file ? extractDateFromFilename(file.name) : null;
    const defaultName = file ? file.name.replace(/\.(csv|xlsx)$/i, '') : `Guest List ${new Date().toLocaleDateString()}`;

    // Check for existing guest list with the same name to prevent duplicates
    const { data: existingLists } = await supabase
      .from('guest_lists')
      .select('id, name')
      .eq('name', guestListName || defaultName)
      .eq('uploaded_by', user.id);

    if (existingLists && existingLists.length > 0) {
      console.log(`⚠️ Found existing guest list with name "${guestListName || defaultName}"`);
      toast({
        title: "Duplicate guest list detected",
        description: `A guest list named "${guestListName || defaultName}" already exists. Consider using a different name.`,
        variant: "destructive"
      });
    }

    const { data: guestList, error: listError } = await supabase
      .from('guest_lists')
      .insert({
        uploaded_by: user.id,
        name: guestListName || defaultName,
        event_date: eventDate?.toISOString().split('T')[0] || null
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
