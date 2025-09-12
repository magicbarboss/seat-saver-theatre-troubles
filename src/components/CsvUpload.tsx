
import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
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

interface ExistingGuest {
  id: string;
  booking_code: string;
  booker_name: string;
  total_quantity: number;
  show_time: string;
  item_details: string;
  notes: string;
  ticket_data: any;
  is_checked_in: boolean;
  pager_number: number | null;
  table_assignments: number[] | null;
  is_seated: boolean;
  checked_in_at: string | null;
  seated_at: string | null;
  interval_pizza_order: boolean;
  interval_drinks_order: boolean;
  manual_override: boolean;
  arriving_late: boolean;
}

interface UpdatePreview {
  toUpdate: number;
  toAdd: number;
  preserved: number;
  details: {
    updatedGuests: Array<{ bookingCode: string; changes: string[] }>;
    newGuests: Array<{ bookingCode: string; name: string }>;
    preservedGuests: Array<{ bookingCode: string; name: string; status: string }>;
  };
}

interface CsvUploadProps {
  onGuestListCreated?: (guestList: GuestList) => void;
}

const CsvUpload: React.FC<CsvUploadProps> = ({ onGuestListCreated }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [guestListName, setGuestListName] = useState('');
  const [updateMode, setUpdateMode] = useState(false);
  const [selectedGuestList, setSelectedGuestList] = useState<string>('');
  const [availableGuestLists, setAvailableGuestLists] = useState<GuestList[]>([]);
  const [updatePreview, setUpdatePreview] = useState<UpdatePreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { user } = useAuth();

  // Fetch available guest lists for update mode
  useEffect(() => {
    if (updateMode && user?.id) {
      fetchAvailableGuestLists();
    }
  }, [updateMode, user?.id]);

  const fetchAvailableGuestLists = async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('guest_lists')
      .select('*')
      .eq('uploaded_by', user.id)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching guest lists:', error);
      toast({
        title: "Error",
        description: "Failed to load guest lists for update",
        variant: "destructive",
      });
    } else {
      setAvailableGuestLists(data || []);
    }
  };

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

  // Helper function to extract guest name from ticket data (for data hygiene)
  const extractGuestNameFromTicketData = useCallback((ticketData: Record<string, any>): string => {
    if (!ticketData) return '';
    
    // Enhanced name extraction - prioritize full names over partial names
    const firstName = ticketData['First Name'] || ticketData['first_name'] || '';
    const lastName = ticketData['Last Name'] || ticketData['last_name'] || '';
    
    if (firstName && lastName) {
      return `${firstName.trim()} ${lastName.trim()}`;
    }
    
    // Check for full name fields first (these typically contain complete names)
    const fullNameFields = [
      'Name', 'Full Name', 'Customer Name', 'Guest Name', 
      'Contact Name', 'Traveller'
    ];
    
    for (const field of fullNameFields) {
      const value = ticketData[field];
      if (value && typeof value === 'string' && value.trim()) {
        const trimmed = value.trim();
        // Prioritize names that contain spaces (likely full names)
        if (trimmed.includes(' ')) {
          console.log(`✅ Found full name "${trimmed}" in field "${field}"`);
          return trimmed;
        }
      }
    }
    
    // Check Via-Cust field specially (extract name from contact info)
    const viaCustValue = ticketData['Via-Cust'];
    if (viaCustValue && typeof viaCustValue === 'string' && viaCustValue.includes('Contact:')) {
      const contactMatch = viaCustValue.match(/Contact:\s*([^:]+?):/);
      if (contactMatch && contactMatch[1]) {
        return contactMatch[1].trim();
      }
    }
    
    // Fallback to single names if no full names found
    for (const field of fullNameFields) {
      const value = ticketData[field];
      if (value && typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    
    // Final fallback - check individual name components
    const bookerField = ticketData['Booker'] || ticketData['booker'] || '';
    if (bookerField) {
      return bookerField.trim();
    }
    
    if (firstName) {
      return firstName.trim();
    } else if (lastName) {
      return lastName.trim();
    }
    
    return '';
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
  }, [calculateTotalQuantityFromTicketData, extractQuantityFromText, extractGuestNameFromTicketData]);

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
            
            // Data hygiene: populate booker_name from ticket_data if missing
            if (!processedGuest.booker_name && processedGuest.ticket_data) {
              const extractedName = extractGuestNameFromTicketData(processedGuest.ticket_data);
              if (extractedName && extractedName !== 'Unknown Guest') {
                processedGuest.booker_name = extractedName;
                console.log(`✅ Data hygiene: Populated booker_name "${extractedName}" from ticket_data for booking ${processedGuest.booking_code}`);
              }
            }
            
            return processedGuest;
          }).filter(guest => 
            guest.booker_name || guest.booking_code || Object.keys(guest.ticket_data || {}).length > 0
          );
          
            // Show Time Inheritance: Ensure add-ons inherit show time from main bookings
            const processedWithInheritance = inheritShowTimesFromMainBookings(processedGuests);
            
            console.log(`✅ Successfully processed ${processedWithInheritance.length} guests from Excel`);
            console.log('👥 Sample processed guests with show times and quantities:', processedWithInheritance.slice(0, 3));
            
            // Log summary of Viator bookings with FIXED date logic
            const viatorGuests = processedWithInheritance.filter(g => g.ticket_data?.Status === 'VIATOR');
            console.log(`🎭 FIXED - Found ${viatorGuests.length} Viator bookings with correct date logic:`, 
              viatorGuests.map(g => `${g.booker_name} (${g.booking_code}): ${g.item_details}`));
            
            resolve(processedWithInheritance);
        } catch (error) {
          console.error('❌ Error processing Excel file:', error);
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read Excel file'));
      reader.readAsArrayBuffer(file);
    });
  }, [extractTicketData, processGuestShowTime, processGuestTotalQuantity, extractGuestNameFromTicketData]);

  // Show Time Inheritance Function - ensures add-ons get show times from main bookings
  const inheritShowTimesFromMainBookings = useCallback((guests: ProcessedGuest[]): ProcessedGuest[] => {
    const bookingGroups = new Map<string, ProcessedGuest[]>();
    
    // Group guests by booking code
    guests.forEach(guest => {
      if (guest.booking_code) {
        if (!bookingGroups.has(guest.booking_code)) {
          bookingGroups.set(guest.booking_code, []);
        }
        bookingGroups.get(guest.booking_code)!.push(guest);
      }
    });
    
    // Process each booking group
    bookingGroups.forEach((groupGuests, bookingCode) => {
      if (groupGuests.length <= 1) return; // No inheritance needed for single bookings
      
      // Find main booking (has show time) and add-ons (missing show time)
      const mainBooking = groupGuests.find(g => g.show_time && isValidShowTime(g.show_time));
      const addOns = groupGuests.filter(g => !g.show_time || !isValidShowTime(g.show_time));
      
      if (mainBooking && addOns.length > 0) {
        console.log(`🔗 Show time inheritance for booking ${bookingCode}: "${mainBooking.show_time}" -> ${addOns.length} add-ons`);
        
        addOns.forEach(addOn => {
          addOn.show_time = mainBooking.show_time;
          console.log(`  ✅ Inherited show time "${mainBooking.show_time}" for add-on: ${addOn.item_details}`);
        });
      }
    });
    
    return guests;
  }, []);

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
              
              // Data hygiene: populate booker_name from ticket_data if missing
              if (!processedGuest.booker_name && processedGuest.ticket_data) {
                const extractedName = extractGuestNameFromTicketData(processedGuest.ticket_data);
                if (extractedName && extractedName !== 'Unknown Guest') {
                  processedGuest.booker_name = extractedName;
                  console.log(`✅ Data hygiene: Populated booker_name "${extractedName}" from ticket_data for booking ${processedGuest.booking_code}`);
                }
              }
              
              return processedGuest;
            }).filter(guest => guest.booker_name || guest.booking_code);
            
            // Show Time Inheritance: Ensure add-ons inherit show time from main bookings
            const processedWithInheritance = inheritShowTimesFromMainBookings(processedGuests);
            
            console.log(`✅ Successfully processed ${processedWithInheritance.length} guests from CSV`);
            console.log('👥 Sample processed guests with show times and quantities:', processedWithInheritance.slice(0, 3));
            
            resolve(processedWithInheritance);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => reject(error)
      });
    });
  }, [extractTicketData, processGuestShowTime, processGuestTotalQuantity]);

  // Smart merge logic for updating existing guest lists
  const generateUpdatePreview = async (newGuests: ProcessedGuest[], selectedListId: string): Promise<UpdatePreview> => {
    // Fetch existing guests from selected list
    const { data: existingGuests, error } = await supabase
      .from('guests')
      .select('*')
      .eq('guest_list_id', selectedListId);

    if (error) throw error;

    const existingGuestsMap = new Map<string, ExistingGuest>();
    (existingGuests || []).forEach(guest => {
      if (guest.booking_code) {
        existingGuestsMap.set(guest.booking_code, guest);
      }
    });

    const toUpdate: Array<{ bookingCode: string; changes: string[] }> = [];
    const toAdd: Array<{ bookingCode: string; name: string }> = [];
    const preserved: Array<{ bookingCode: string; name: string; status: string }> = [];

    newGuests.forEach(newGuest => {
      if (!newGuest.booking_code) return;

      const existing = existingGuestsMap.get(newGuest.booking_code);
      
      if (existing) {
        const changes: string[] = [];
        
        // Check what would change (excluding protected fields)
        if (existing.booker_name !== newGuest.booker_name) changes.push('name');
        if (existing.total_quantity !== newGuest.total_quantity) changes.push('quantity');
        if (existing.show_time !== newGuest.show_time) changes.push('show time');
        if (existing.item_details !== newGuest.item_details) changes.push('items');
        
        if (changes.length > 0) {
          toUpdate.push({ bookingCode: newGuest.booking_code, changes });
        }

        // Mark as preserved with status
        let status = 'unchanged';
        if (existing.is_checked_in) status = 'checked in';
        if (existing.is_seated) status = 'seated';
        if (existing.pager_number) status = 'has pager';
        
        preserved.push({ 
          bookingCode: newGuest.booking_code, 
          name: existing.booker_name, 
          status 
        });
      } else {
        toAdd.push({ 
          bookingCode: newGuest.booking_code, 
          name: newGuest.booker_name || 'Unknown' 
        });
      }
    });

    return {
      toUpdate: toUpdate.length,
      toAdd: toAdd.length,
      preserved: preserved.length,
      details: {
        updatedGuests: toUpdate,
        newGuests: toAdd,
        preservedGuests: preserved
      }
    };
  };

  const performSmartUpdate = async (newGuests: ProcessedGuest[], selectedListId: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    // Fetch existing guests
    const { data: existingGuests, error: fetchError } = await supabase
      .from('guests')
      .select('*')
      .eq('guest_list_id', selectedListId);

    if (fetchError) throw fetchError;

    const existingGuestsMap = new Map<string, ExistingGuest>();
    (existingGuests || []).forEach(guest => {
      if (guest.booking_code) {
        existingGuestsMap.set(guest.booking_code, guest);
      }
    });

    const guestsToUpdate: any[] = [];
    const guestsToInsert: any[] = [];

    newGuests.forEach(newGuest => {
      if (!newGuest.booking_code) return;

      const existing = existingGuestsMap.get(newGuest.booking_code);
      
      if (existing) {
        // Update existing guest but preserve check-in data
        const updatedGuest = {
          id: existing.id,
          // Update these fields from new data
          booker_name: newGuest.booker_name || existing.booker_name,
          total_quantity: newGuest.total_quantity || existing.total_quantity,
          show_time: newGuest.show_time || existing.show_time,
          item_details: newGuest.item_details || existing.item_details,
          notes: newGuest.notes || existing.notes,
          ticket_data: newGuest.ticket_data || existing.ticket_data,
          
          // PRESERVE these critical fields
          is_checked_in: existing.is_checked_in,
          pager_number: existing.pager_number,
          table_assignments: existing.table_assignments,
          is_seated: existing.is_seated,
          checked_in_at: existing.checked_in_at,
          seated_at: existing.seated_at,
          interval_pizza_order: existing.interval_pizza_order,
          interval_drinks_order: existing.interval_drinks_order,
          manual_override: existing.manual_override,
          arriving_late: existing.arriving_late
        };
        
        guestsToUpdate.push(updatedGuest);
      } else {
        // Insert new guest
        guestsToInsert.push({
          ...newGuest,
          guest_list_id: selectedListId
        });
      }
    });

    // Perform updates
    if (guestsToUpdate.length > 0) {
      for (const guest of guestsToUpdate) {
        const { error: updateError } = await supabase
          .from('guests')
          .update(guest)
          .eq('id', guest.id);
        
        if (updateError) throw updateError;
      }
    }

    // Perform inserts
    if (guestsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('guests')
        .insert(guestsToInsert);
      
      if (insertError) throw insertError;
    }

    // Get the updated guest list
    const { data: guestList, error: listError } = await supabase
      .from('guest_lists')
      .select('*')
      .eq('id', selectedListId)
      .single();

    if (listError) throw listError;

    return guestList;
  };

  const uploadGuests = async (guests: ProcessedGuest[]) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    // Handle update mode
    if (updateMode && selectedGuestList) {
      return await performSmartUpdate(guests, selectedGuestList);
    }

    // Original create new list logic
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

  const handleGeneratePreview = async () => {
    if (!file || !user?.id || !updateMode || !selectedGuestList) return;

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

      const preview = await generateUpdatePreview(guests, selectedGuestList);
      setUpdatePreview(preview);
      setShowPreview(true);
      
      toast({
        title: "Preview Generated",
        description: `Ready to update: ${preview.toUpdate} guests, add: ${preview.toAdd} new guests`
      });

    } catch (error) {
      console.error('Preview error:', error);
      toast({
        title: "Preview failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !user?.id) return;
    if (updateMode && !selectedGuestList) return;

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
      const actionText = updateMode ? "updated" : "uploaded";
      toast({
        title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} successful`,
        description: updateMode 
          ? `Successfully updated guest list with ${guests.length} guests`
          : `Successfully uploaded ${guests.length} guests`
      });

      // Call the callback if provided
      if (onGuestListCreated) {
        onGuestListCreated(guestList);
      }
      
      // Reset preview state
      setShowPreview(false);
      setUpdatePreview(null);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: updateMode ? "Update failed" : "Upload failed",
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
          {updateMode ? <RefreshCw className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}
          {updateMode ? 'Update Guest List' : 'Upload Guest List'}
        </CardTitle>
        <CardDescription>
          {updateMode 
            ? 'Update an existing guest list with new data while preserving check-in status and other operational data.'
            : 'Upload a CSV or Excel file containing guest information. For Excel files, headers should be in row 4.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Update Mode Toggle */}
        <div className="flex items-center space-x-2 p-3 border rounded-lg">
          <Checkbox 
            id="update-mode"
            checked={updateMode}
            onCheckedChange={(checked) => {
              setUpdateMode(checked as boolean);
              setSelectedGuestList('');
              setShowPreview(false);
              setUpdatePreview(null);
            }}
          />
          <Label htmlFor="update-mode" className="text-sm font-medium">
            Update existing list instead of creating new one
          </Label>
        </div>

        {/* Guest List Selection for Update Mode */}
        {updateMode && (
          <div className="space-y-2">
            <Label htmlFor="guest-list-select">Select Guest List to Update</Label>
            <Select value={selectedGuestList} onValueChange={setSelectedGuestList}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a guest list to update..." />
              </SelectTrigger>
              <SelectContent>
                {availableGuestLists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name} ({new Date(list.uploaded_at).toLocaleDateString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Guest List Name (only for create mode) */}
        {!updateMode && (
          <div className="space-y-2">
            <Label htmlFor="guest-list-name">Guest List Name (Optional)</Label>
            <Input
              id="guest-list-name"
              placeholder="Enter a name for this guest list..."
              value={guestListName}
              onChange={(e) => setGuestListName(e.target.value)}
            />
          </div>
        )}

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

        {/* Preview for Update Mode */}
        {updateMode && file && selectedGuestList && !showPreview && (
          <Button
            onClick={handleGeneratePreview}
            disabled={uploading}
            variant="outline"
            className="w-full"
          >
            {uploading ? "Generating Preview..." : "Preview Changes"}
          </Button>
        )}

        {/* Update Preview Display */}
        {showPreview && updatePreview && (
          <div className="space-y-3 p-4 border rounded-lg bg-blue-50">
            <h4 className="font-medium text-blue-900">Update Preview</h4>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="text-lg font-bold text-orange-600">{updatePreview.toUpdate}</div>
                <div className="text-muted-foreground">To Update</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">{updatePreview.toAdd}</div>
                <div className="text-muted-foreground">To Add</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">{updatePreview.preserved}</div>
                <div className="text-muted-foreground">Preserved</div>
              </div>
            </div>
            <div className="text-xs text-blue-800">
              • Check-in status, pager assignments, and table allocations will be preserved
              • Only guest details (name, quantity, show time, items) will be updated
            </div>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={
            !file || 
            uploading || 
            uploadComplete || 
            (updateMode && (!selectedGuestList || !showPreview))
          }
          className="w-full"
        >
          {uploading ? (
            updateMode ? "Updating..." : "Uploading..."
          ) : uploadComplete ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              {updateMode ? 'Update Complete' : 'Upload Complete'}
            </>
          ) : (
            <>
              {updateMode ? <RefreshCw className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
              {updateMode ? 'Update Guest List' : 'Upload Guest List'}
            </>
          )}
        </Button>

        {uploadComplete && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-800">
              Guest list {updateMode ? 'updated' : 'uploaded'} successfully! 
              {updateMode 
                ? ' All existing check-in data has been preserved.'
                : ' You can now proceed to check-in guests.'
              }
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CsvUpload;
