
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface CsvData {
  headers: string[];
  rows: string[][];
}

interface CsvUploadProps {
  onGuestListCreated?: (guestList: any) => void;
}

const CsvUpload = ({ onGuestListCreated }: CsvUploadProps) => {
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Handle Excel files
        const workbook = XLSX.read(data, { type: 'binary' });
        console.log('Available sheets:', workbook.SheetNames);
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log('Raw Excel data (first 15 rows):', jsonData.slice(0, 15));
        
        if (jsonData.length === 0) return;
        
        // Find the header row by looking for key header indicators
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
          const row = jsonData[i] as any[];
          if (row && row.some(cell => {
            const cellText = String(cell || '').toLowerCase();
            return cellText.includes('booker') || 
                   cellText.includes('booking') ||
                   cellText.includes('ticket') ||
                   cellText.includes('item') ||
                   cellText.includes('guests') ||
                   cellText.includes('code');
          })) {
            headerRowIndex = i;
            console.log('Found header row at index:', i, 'with data:', row);
            break;
          }
        }
        
        // If no header found, try the default row 4 (index 3)
        if (headerRowIndex === -1) {
          headerRowIndex = 3;
          console.log('No header row found, using default index 3');
        }
        
        if (jsonData.length <= headerRowIndex) {
          console.log('Not enough rows in the file');
          return;
        }
        
        const headers = (jsonData[headerRowIndex] as string[])
          .map(header => String(header || '').trim())
          .filter(header => header !== ''); // Remove empty headers
        
        console.log('Processed headers:', headers);
        
        const rows = jsonData.slice(headerRowIndex + 1)
          .filter(row => {
            if (!row || (row as any[]).length === 0) return false;
            // Check if row has meaningful data (not just empty cells)
            const meaningfulCells = (row as any[]).filter(cell => 
              String(cell || '').trim() !== ''
            );
            return meaningfulCells.length > 2; // At least 3 non-empty cells
          })
          .map(row => {
            const processedRow = (row as any[]).map(cell => String(cell || '').trim());
            // Pad row to match header length
            while (processedRow.length < headers.length) {
              processedRow.push('');
            }
            return processedRow.slice(0, headers.length); // Trim to header length
          });
        
        console.log('Sample processed rows:', rows.slice(0, 5));
        console.log(`Final data: ${headers.length} headers, ${rows.length} rows`);
        
        setCsvData({ headers, rows });
      } else {
        // Handle CSV/TSV files - detect delimiter
        const text = data as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length === 0) return;

        // Find header row
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(lines.length, 10); i++) {
          if (lines[i].toLowerCase().includes('booker') || lines[i].toLowerCase().includes('booking')) {
            headerRowIndex = i;
            break;
          }
        }

        // Check if it's comma-separated or tab-separated by looking at the header line
        const headerLine = lines[headerRowIndex];
        const commaCount = (headerLine.match(/,/g) || []).length;
        const tabCount = (headerLine.match(/\t/g) || []).length;
        
        console.log('Header line:', headerLine);
        console.log('Comma count:', commaCount, 'Tab count:', tabCount);
        
        // Use the delimiter that appears most frequently
        const delimiter = commaCount > tabCount ? ',' : '\t';
        console.log('Using delimiter:', delimiter === ',' ? 'comma' : 'tab');

        const headers = lines[headerRowIndex].split(delimiter)
          .map(header => header.trim().replace(/"/g, ''))
          .filter(header => header !== '');
        
        const rows = lines.slice(headerRowIndex + 1)
          .filter(line => {
            const cells = line.split(delimiter);
            const meaningfulCells = cells.filter(cell => cell.trim().replace(/"/g, '') !== '');
            return meaningfulCells.length > 2;
          })
          .map(line => {
            const processedRow = line.split(delimiter).map(cell => cell.trim().replace(/"/g, ''));
            while (processedRow.length < headers.length) {
              processedRow.push('');
            }
            return processedRow.slice(0, headers.length);
          });

        console.log('Parsed headers:', headers);
        console.log('Sample parsed rows:', rows.slice(0, 3));

        setCsvData({ headers, rows });
      }
    };

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file);
    }
  };

  const findColumnIndex = (headers: string[], searchTerms: string[]): number => {
    for (const term of searchTerms) {
      const index = headers.findIndex(header => 
        header.toLowerCase().includes(term.toLowerCase())
      );
      if (index !== -1) {
        console.log(`Found column "${headers[index]}" at index ${index} for search term "${term}"`);
        return index;
      }
    }
    console.log(`No column found for search terms: ${searchTerms.join(', ')}`);
    return -1;
  };

  const saveToDatabase = async () => {
    if (!csvData || !user) return;

    setUploading(true);
    
    try {
      console.log('Starting database save process...');
      
      // Create guest list
      const { data: guestList, error: listError } = await supabase
        .from('guest_lists')
        .insert({
          name: fileName,
          uploaded_by: user.id
        })
        .select()
        .single();

      if (listError) {
        console.error('Error creating guest list:', listError);
        throw listError;
      }
      
      console.log('Created guest list:', guestList);

      // Find column indices for key fields
      const bookerIndex = findColumnIndex(csvData.headers, ['booker', 'booker name']);
      const bookingCodeIndex = findColumnIndex(csvData.headers, ['booking code', 'code']);
      const totalQtyIndex = findColumnIndex(csvData.headers, ['total quantity', 'quantity', 'total']);
      const itemIndex = findColumnIndex(csvData.headers, ['item', 'show', 'event']);
      const noteIndex = findColumnIndex(csvData.headers, ['note', 'notes']);

      console.log('Column indices:', {
        booker: bookerIndex,
        bookingCode: bookingCodeIndex,
        totalQty: totalQtyIndex,
        item: itemIndex,
        note: noteIndex
      });

      // TICKET_TYPE_MAPPING - standardized list matching CheckInSystem exactly
      const TICKET_TYPE_MAPPING = [
        // Standard House Magicians tickets
        'House Magicians Show Ticket',
        'House Magicians Show Ticket & 2 Drinks',
        'House Magicians Show Ticket & 1 Pizza',
        'House Magicians Show Ticket includes 2 Drinks +  1 Pizza',
        'House Magicians Show Ticket includes 2 Drinks + 1 Pizza',
        'House Magicians Show Ticket & 2 soft drinks',
        
        // Adult Show tickets
        'Adult Show Ticket includes 2 Drinks',
        'Adult Show Ticket includes 2 Drinks + 9" Pizza',
        'Adult Show Ticket induces 2 soft drinks',
        'Adult Show Ticket induces 2 soft drinks + 9" PIzza',
        'Adult Show Ticket induces 2 soft drinks + 9 PIzza',
        
        // Comedy tickets
        'Comedy ticket plus 9" Pizza',
        'Comedy ticket plus 9 Pizza',
        'Adult Comedy & Magic Show Ticket + 9" Pizza',
        'Adult Comedy & Magic Show Ticket + 9 Pizza',
        'Adult Comedy Magic Show ticket',
        
        // Groupon packages
        'Groupon Offer Prosecco Package (per person)',
        'Groupon Magic & Pints Package (per person)',
        'Groupon Magic & Cocktails Package (per person)',
        'Groupon Magic Show, Snack and Loaded Fries Package (per person)',
        'OLD Groupon Offer (per person - extras are already included)',
        
        // Wowcher packages
        'Wowcher Magic & Cocktails Package (per person)',
        
        // Smoke offers
        'Smoke Offer Ticket & 1x Drink',
        'Smoke Offer Ticket & 1x Drink (minimum x2 people)',
        'Smoke Offer Ticket includes Drink (minimum x2)'
      ];

        // Function to extract show time from item details
        const extractShowTime = (itemDetails: string): string => {
          if (!itemDetails) return '';
          
          // Extract time from formats like [7:00pm], [8:00pm], [9:00pm]
          const timeMatch = itemDetails.match(/\[(\d+):00pm\]/i);
          if (timeMatch) {
            const hour = timeMatch[1];
            return `${hour}pm`;
          }
          
          // Fallback: look for standalone time patterns like 7:00pm, 8:00pm, 9:00pm
          const fallbackMatch = itemDetails.match(/(\d+):00pm/i);
          if (fallbackMatch) {
            const hour = fallbackMatch[1];
            return `${hour}pm`;
          }
          
          return '';
        };

        // Prepare guest data with proper field mapping and enhanced validation
        const guestsData = csvData.rows.map((row, index) => {
          const ticketData: any = {};
          const extractedTickets: any = {};

          // Extract key fields from the correct columns first
          const bookerName = bookerIndex >= 0 ? row[bookerIndex] || '' : '';
          const bookingCode = bookingCodeIndex >= 0 ? row[bookingCodeIndex] || '' : '';
          const totalQuantity = totalQtyIndex >= 0 ? parseInt(row[totalQtyIndex]) || 1 : 1;

          // Process each header and extract ticket quantities
          csvData.headers.forEach((header, headerIndex) => {
            const cellValue = row[headerIndex] || '';
            ticketData[header] = cellValue;

            // Check if this header matches a known ticket type
            if (TICKET_TYPE_MAPPING.includes(header)) {
              // If the cell has any non-empty value (text or number), this ticket type is present
              if (cellValue && cellValue.toString().trim() !== '') {
                const numericValue = parseInt(cellValue);
                if (!isNaN(numericValue) && numericValue > 0) {
                  // If it's a valid number, use that as quantity
                  extractedTickets[header] = numericValue;
                  console.log(`Found ticket type "${header}" with numeric quantity ${numericValue} for row ${index}`);
                } else {
                  // If it's text (like guest names), assign the total booking quantity
                  extractedTickets[header] = totalQuantity;
                  console.log(`Found ticket type "${header}" with text value "${cellValue}", assigning total quantity ${totalQuantity} for row ${index}`);
                }
              }
            }
          });
          const itemDetails = itemIndex >= 0 ? row[itemIndex] || '' : '';
          const notes = noteIndex >= 0 ? row[noteIndex] || '' : '';
          
          // Extract show time from item details
          const showTime = extractShowTime(itemDetails);

        // Enhanced validation - skip rows with no meaningful data
        if (!bookerName && !bookingCode && totalQuantity <= 0) {
          console.log(`Skipping row ${index}: no meaningful data`);
          return null;
        }

        // Detect if guest has pizza tickets
        const hasPizzaTickets = Object.keys(extractedTickets).some(ticketType => 
          ticketType.toLowerCase().includes('pizza')
        );

        // Detect if guest has drink tickets
        const hasDrinkTickets = Object.keys(extractedTickets).some(ticketType => 
          ticketType.toLowerCase().includes('drink')
        );

        const guestRecord = {
          guest_list_id: guestList.id,
          booking_code: bookingCode,
          booker_name: bookerName,
          total_quantity: totalQuantity,
          show_time: showTime, // Extract show time from item details
          item_details: itemDetails,
          notes: notes,
          interval_pizza_order: hasPizzaTickets,
          interval_drinks_order: hasDrinkTickets,
          ticket_data: { 
            ...ticketData, // Keep all original CSV data
            extracted_tickets: extractedTickets // Add structured ticket quantities
          },
          original_row_index: index
        };
        
        // Log the first few records to debug
        if (index < 5) {
          console.log(`Guest record ${index}:`, guestRecord);
          // Special logging for Andrew Williams
          if (bookerName.toLowerCase().includes('andrew')) {
            console.log('=== ANDREW WILLIAMS DEBUG INFO ===');
            console.log('Booker name:', bookerName);
            console.log('Ticket data keys:', Object.keys(ticketData));
            console.log('House Magicians Show Ticket & 2 Drinks field:', ticketData['House Magicians Show Ticket & 2 Drinks']);
            console.log('All ticket data:', ticketData);
          }
        }
        
        return guestRecord;
      }).filter(record => record !== null); // Remove null records

      console.log(`Attempting to insert ${guestsData.length} guest records...`);

      // Insert guests
      const { data: insertedGuests, error: guestsError } = await supabase
        .from('guests')
        .insert(guestsData)
        .select();

      if (guestsError) {
        console.error('Error inserting guests:', guestsError);
        throw guestsError;
      }

      console.log(`Successfully inserted ${insertedGuests?.length || 0} guests`);

      toast({
        title: "Success",
        description: `Uploaded ${guestsData.length} guests successfully`,
      });

      if (onGuestListCreated) {
        onGuestListCreated(guestList);
      }

    } catch (error: any) {
      console.error('Database save error:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <Label htmlFor="csv-upload">Upload Your Theatre File (Excel or CSV)</Label>
        <div className="flex items-center space-x-2">
          <Input
            id="csv-upload"
            type="file"
            accept=".csv,.tsv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="flex-1"
          />
          <Button variant="outline" size="icon">
            <Upload className="h-4 w-4" />
          </Button>
        </div>
        {fileName && (
          <p className="text-sm text-muted-foreground">
            Loaded: {fileName}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Supports Excel (.xlsx, .xls) and CSV/TSV files. Excel files provide better data parsing.
        </p>
      </div>

      {csvData && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">File Contents</h3>
            <Button onClick={saveToDatabase} disabled={uploading}>
              {uploading ? 'Saving...' : 'Save Guest List'}
            </Button>
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  {csvData.headers.slice(0, 8).map((header, index) => (
                    <TableHead key={index}>{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvData.rows.slice(0, 10).map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {row.slice(0, 8).map((cell, cellIndex) => (
                      <TableCell key={cellIndex}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {csvData.rows.length > 10 && (
              <p className="text-sm text-muted-foreground p-4 border-t">
                Showing first 10 rows of {csvData.rows.length} total rows. Click "Save Guest List" to store all data.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CsvUpload;
