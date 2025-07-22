import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface CsvData {
  headers: string[];
  rows: string[][];
  totalRows: number;
  detectedColumns: {
    booker?: string;
    bookingCode?: string;
    totalQty?: string;
    item?: string;
    note?: string;
  };
}

interface CsvUploadProps {
  onGuestListCreated?: (guestList: any) => void;
}

const CsvUpload = ({ onGuestListCreated }: CsvUploadProps) => {
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [parsingError, setParsingError] = useState<string>('');
  const { user } = useAuth();
  const { toast } = useToast();

  const detectColumns = (headers: string[]) => {
    const detected: CsvData['detectedColumns'] = {};
    
    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase();
      
      if (lowerHeader.includes('booker') && !detected.booker) {
        detected.booker = header;
      } else if (lowerHeader.includes('booking') && lowerHeader.includes('code') && !detected.bookingCode) {
        detected.bookingCode = header;
      } else if ((lowerHeader.includes('total') && lowerHeader.includes('quantity')) || 
                 (lowerHeader.includes('quantity') && !detected.totalQty)) {
        detected.totalQty = header;
      } else if ((lowerHeader.includes('item') || lowerHeader.includes('show') || lowerHeader.includes('event')) && !detected.item) {
        detected.item = header;
      } else if ((lowerHeader.includes('note') || lowerHeader.includes('notes')) && !detected.note) {
        detected.note = header;
      }
    });
    
    console.log('Detected columns:', detected);
    return detected;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParsingError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      
      try {
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          console.log('Processing Excel file...');
          
          // Handle Excel files
          const workbook = XLSX.read(data, { type: 'binary' });
          console.log('Available sheets:', workbook.SheetNames);
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          console.log(`Raw Excel data: ${jsonData.length} rows`);
          console.log('First 5 rows:', jsonData.slice(0, 5));
          
          if (jsonData.length === 0) {
            setParsingError('Excel file appears to be empty');
            return;
          }
          
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
            setParsingError('Not enough rows in the Excel file after header detection');
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
          
          console.log(`Final Excel data: ${headers.length} headers, ${rows.length} rows`);
          console.log('Sample processed rows:', rows.slice(0, 3));
          
          const detectedColumns = detectColumns(headers);
          setCsvData({ 
            headers, 
            rows, 
            totalRows: rows.length,
            detectedColumns 
          });
          
        } else {
          console.log('Processing CSV/TSV file...');
          
          // Handle CSV/TSV files with Papa Parse for robust parsing
          const text = data as string;
          
          // Auto-detect delimiter by testing the first few lines
          const sampleLines = text.split('\n').slice(0, 5).join('\n');
          const delimiters = [',', '\t', ';', '|'];
          let bestDelimiter = ',';
          let maxColumns = 0;
          
          for (const delimiter of delimiters) {
            const testResult = Papa.parse(sampleLines, { 
              delimiter,
              skipEmptyLines: true,
              header: false
            });
            
            if (testResult.data.length > 0) {
              const avgColumns = testResult.data.reduce((sum, row: any) => sum + row.length, 0) / testResult.data.length;
              if (avgColumns > maxColumns) {
                maxColumns = avgColumns;
                bestDelimiter = delimiter;
              }
            }
          }
          
          console.log(`Auto-detected delimiter: "${bestDelimiter}" (${bestDelimiter === ',' ? 'comma' : bestDelimiter === '\t' ? 'tab' : bestDelimiter === ';' ? 'semicolon' : 'pipe'})`);
          
          // Parse with Papa Parse using detected delimiter
          const parseResult = Papa.parse(text, {
            delimiter: bestDelimiter,
            skipEmptyLines: true,
            header: false,
            transformHeader: (header: string) => header.trim(),
            transform: (value: string) => value.trim()
          });
          
          if (parseResult.errors.length > 0) {
            console.warn('CSV parsing warnings:', parseResult.errors);
          }
          
          const parsedData = parseResult.data as string[][];
          
          if (parsedData.length === 0) {
            setParsingError('CSV file appears to be empty');
            return;
          }
          
          console.log(`Parsed CSV data: ${parsedData.length} rows`);
          console.log('First 5 rows:', parsedData.slice(0, 5));
          
          // Find header row
          let headerRowIndex = 0;
          for (let i = 0; i < Math.min(parsedData.length, 10); i++) {
            const row = parsedData[i];
            if (row && row.some(cell => {
              const cellText = cell.toLowerCase();
              return cellText.includes('booker') || 
                     cellText.includes('booking') ||
                     cellText.includes('ticket') ||
                     cellText.includes('item');
            })) {
              headerRowIndex = i;
              console.log('Found header row at index:', i);
              break;
            }
          }
          
          const headers = parsedData[headerRowIndex].filter(header => header && header.trim() !== '');
          const rows = parsedData.slice(headerRowIndex + 1)
            .filter(row => {
              const meaningfulCells = row.filter(cell => cell && cell.trim() !== '');
              return meaningfulCells.length > 2;
            })
            .map(row => {
              const processedRow = [...row];
              while (processedRow.length < headers.length) {
                processedRow.push('');
              }
              return processedRow.slice(0, headers.length);
            });

          console.log(`Final CSV data: ${headers.length} headers, ${rows.length} rows`);
          console.log('Parsed headers:', headers);
          console.log('Sample parsed rows:', rows.slice(0, 3));

          const detectedColumns = detectColumns(headers);
          setCsvData({ 
            headers, 
            rows, 
            totalRows: rows.length,
            detectedColumns 
          });
        }
      } catch (error) {
        console.error('File parsing error:', error);
        setParsingError(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        'House Magicians Show Ticket',
        'House Magicians Show Ticket & 2 Drinks',
        'House Magicians Show Ticket & 1 Pizza',
        'House Magicians Show Ticket includes 2 Drinks +  1 Pizza',
        'House Magicians Show Ticket includes 2 Drinks + 1 Pizza',
        'House Magicians Show Ticket & 2 soft drinks',
        'Adult Show Ticket includes 2 Drinks',
        'Adult Show Ticket includes 2 Drinks + 9" Pizza',
        'Adult Show Ticket induces 2 soft drinks',
        'Adult Show Ticket induces 2 soft drinks + 9" PIzza',
        'Adult Show Ticket induces 2 soft drinks + 9 PIzza',
        'Comedy ticket plus 9" Pizza',
        'Comedy ticket plus 9 Pizza',
        'Adult Comedy & Magic Show Ticket + 9" Pizza',
        'Adult Comedy & Magic Show Ticket + 9 Pizza',
        'Adult Comedy Magic Show ticket',
        'Groupon Offer Prosecco Package (per person)',
        'Groupon Magic & Pints Package (per person)',
        'Groupon Magic & Cocktails Package (per person)',
        'Groupon Magic Show, Snack and Loaded Fries Package (per person)',
        'OLD Groupon Offer (per person - extras are already included)',
        'Wowcher Magic & Cocktails Package (per person)',
        'Smoke Offer Ticket & 1x Drink',
        'Smoke Offer Ticket & 1x Drink (minimum x2 people)',
        'Smoke Offer Ticket includes Drink (minimum x2)'
      ];

      const extractShowTime = (itemDetails: string): string => {
        if (!itemDetails) return '';
        
        const timeMatch = itemDetails.match(/\[(\d+):00pm\]/i);
        if (timeMatch) {
          const hour = timeMatch[1];
          return `${hour}pm`;
        }
        
        const fallbackMatch = itemDetails.match(/(\d+):00pm/i);
        if (fallbackMatch) {
          const hour = fallbackMatch[1];
          return `${hour}pm`;
        }
        
        return '';
      };

      const guestsData = csvData.rows.map((row, index) => {
        const ticketData: any = {};
        const extractedTickets: any = {};

        const bookerName = bookerIndex >= 0 ? row[bookerIndex] || '' : '';
        const bookingCode = bookingCodeIndex >= 0 ? row[bookingCodeIndex] || '' : '';
        const totalQuantity = totalQtyIndex >= 0 ? parseInt(row[totalQtyIndex]) || 1 : 1;

        csvData.headers.forEach((header, headerIndex) => {
          const cellValue = row[headerIndex] || '';
          ticketData[header] = cellValue;

          if (TICKET_TYPE_MAPPING.includes(header)) {
            if (cellValue && cellValue.toString().trim() !== '') {
              const cellText = cellValue.toString().trim();
              const numericValue = parseInt(cellValue);
              
              const statusWords = ['paid', 'paid in gyg', 'viator', 'dan', 'pending', 'cancelled', 'confirmed'];
              const isStatusWord = statusWords.includes(cellText.toLowerCase());
              
              const containsFriendNames = cellText.includes('&') || 
                                          (cellText.split(' ').length > 2 && 
                                           !cellText.toLowerCase().includes('ticket') &&
                                           !cellText.toLowerCase().includes('package') &&
                                           !cellText.toLowerCase().includes('offer'));
              
              if (!isNaN(numericValue) && numericValue > 0) {
                extractedTickets[header] = numericValue;
                console.log(`Found ticket type "${header}" with numeric quantity ${numericValue} for row ${index}`);
              } else if (!isStatusWord && !containsFriendNames && cellText !== '') {
                extractedTickets[header] = totalQuantity;
                console.log(`Found ticket type "${header}" with valid selection "${cellValue}", assigning total quantity ${totalQuantity} for row ${index}`);
              } else {
                console.log(`Skipping ticket type "${header}" - invalid value: "${cellValue}" (status: ${isStatusWord}, friends: ${containsFriendNames}) for row ${index}`);
              }
            }
          }
        });
        
        const itemDetails = itemIndex >= 0 ? row[itemIndex] || '' : '';
        const notes = noteIndex >= 0 ? row[noteIndex] || '' : '';
        const showTime = extractShowTime(itemDetails);

        if (!bookerName && !bookingCode && totalQuantity <= 0) {
          console.log(`Skipping row ${index}: no meaningful data`);
          return null;
        }

        const hasPizzaTickets = Object.keys(extractedTickets).some(ticketType => 
          ticketType.toLowerCase().includes('pizza')
        );

        const hasDrinkTickets = Object.keys(extractedTickets).some(ticketType => 
          ticketType.toLowerCase().includes('drink')
        );

        const dietInfo = ticketData.DIET || ticketData.Diet || ticketData.diet;
        const cleanDietInfo = dietInfo && typeof dietInfo === 'string' && dietInfo.trim() !== '' ? dietInfo.trim() : null;
        
        const magicInfo = ticketData.Magic || ticketData.MAGIC || ticketData.magic;
        const cleanMagicInfo = magicInfo && typeof magicInfo === 'string' && magicInfo.trim() !== '' ? magicInfo.trim() : null;

        const guestRecord = {
          guest_list_id: guestList.id,
          booking_code: bookingCode,
          booker_name: bookerName,
          total_quantity: totalQuantity,
          show_time: showTime,
          item_details: itemDetails,
          notes: notes,
          interval_pizza_order: hasPizzaTickets,
          interval_drinks_order: hasDrinkTickets,
          diet_info: cleanDietInfo,
          magic_info: cleanMagicInfo,
          ticket_data: { 
            ...ticketData,
            extracted_tickets: extractedTickets
          },
          original_row_index: index
        };
        
        if (index < 5) {
          console.log(`Guest record ${index}:`, guestRecord);
          if (bookerName.toLowerCase().includes('andrew')) {
            console.log('=== ANDREW WILLIAMS DEBUG INFO ===');
            console.log('Booker name:', bookerName);
            console.log('Ticket data keys:', Object.keys(ticketData));
            console.log('House Magicians Show Ticket & 2 Drinks field:', ticketData['House Magicians Show Ticket & 2 Drinks']);
            console.log('All ticket data:', ticketData);
          }
        }
        
        return guestRecord;
      }).filter(record => record !== null);

      console.log(`Attempting to insert ${guestsData.length} guest records...`);

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
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
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
          Supports Excel (.xlsx, .xls) and CSV/TSV files. Advanced parsing handles commas in text properly.
        </p>
      </div>

      {parsingError && (
        <div className="flex items-center space-x-2 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <p className="text-sm text-destructive">{parsingError}</p>
        </div>
      )}

      {csvData && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">File Contents</h3>
              <p className="text-sm text-muted-foreground">
                {csvData.totalRows} total rows • {csvData.headers.length} columns
              </p>
            </div>
            <Button onClick={saveToDatabase} disabled={uploading}>
              {uploading ? 'Saving...' : 'Save Guest List'}
            </Button>
          </div>

          {/* Column Detection Status */}
          <div className="bg-muted/50 p-4 rounded-md">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Column Detection
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <div>Booker: {csvData.detectedColumns.booker || 'Not found'}</div>
              <div>Booking Code: {csvData.detectedColumns.bookingCode || 'Not found'}</div>
              <div>Quantity: {csvData.detectedColumns.totalQty || 'Not found'}</div>
              <div>Item/Show: {csvData.detectedColumns.item || 'Not found'}</div>
              <div>Notes: {csvData.detectedColumns.note || 'Not found'}</div>
            </div>
          </div>

          {/* Enhanced Data Preview */}
          <div className="border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {csvData.headers.slice(0, 12).map((header, index) => (
                      <TableHead key={index} className="min-w-[120px]">
                        {header}
                      </TableHead>
                    ))}
                    {csvData.headers.length > 12 && (
                      <TableHead className="text-muted-foreground">
                        +{csvData.headers.length - 12} more columns
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.rows.slice(0, 15).map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {row.slice(0, 12).map((cell, cellIndex) => (
                        <TableCell key={cellIndex} className="max-w-[200px] truncate">
                          {cell || <span className="text-muted-foreground italic">empty</span>}
                        </TableCell>
                      ))}
                      {csvData.headers.length > 12 && (
                        <TableCell className="text-muted-foreground">...</TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {csvData.rows.length > 15 && (
              <div className="p-4 border-t bg-muted/30">
                <p className="text-sm text-muted-foreground text-center">
                  Showing first 15 rows of {csvData.totalRows} total rows. 
                  {csvData.headers.length > 12 && ` Showing first 12 columns of ${csvData.headers.length} total columns.`}
                  {' '}Click "Save Guest List" to store all data.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CsvUpload;
