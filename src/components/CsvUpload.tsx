
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
        
        console.log('Raw Excel data:', jsonData.slice(0, 10));
        
        if (jsonData.length === 0) return;
        
        // Look for headers starting from row 4 (index 3)
        const headerRowIndex = 3;
        console.log('Using header row at index:', headerRowIndex, 'with data:', jsonData[headerRowIndex]);
        
        if (jsonData.length <= headerRowIndex) {
          console.log('Not enough rows in the file');
          return;
        }
        
        const headers = (jsonData[headerRowIndex] as string[]).map(header => String(header || '').trim());
        const rows = jsonData.slice(headerRowIndex + 1)
          .filter(row => row && (row as any[]).length > 1)
          .map(row => 
            (row as any[]).map(cell => String(cell || '').trim())
          );
        
        console.log('Processed headers:', headers);
        console.log('Sample processed rows:', rows.slice(0, 3));
        
        setCsvData({ headers, rows });
      } else {
        // Handle CSV/TSV files - detect delimiter
        const text = data as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length === 0) return;

        // Check if it's comma-separated or tab-separated by looking at the first line
        const firstLine = lines[0];
        const commaCount = (firstLine.match(/,/g) || []).length;
        const tabCount = (firstLine.match(/\t/g) || []).length;
        
        console.log('First line:', firstLine);
        console.log('Comma count:', commaCount, 'Tab count:', tabCount);
        
        // Use the delimiter that appears most frequently
        const delimiter = commaCount > tabCount ? ',' : '\t';
        console.log('Using delimiter:', delimiter === ',' ? 'comma' : 'tab');

        const headers = lines[0].split(delimiter).map(header => header.trim().replace(/"/g, ''));
        const rows = lines.slice(1).map(line => 
          line.split(delimiter).map(cell => cell.trim().replace(/"/g, ''))
        );

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

      // Prepare guest data with proper field mapping
      const guestsData = csvData.rows.map((row, index) => {
        const ticketData: any = {};
        csvData.headers.forEach((header, headerIndex) => {
          ticketData[header] = row[headerIndex] || '';
        });

        // Extract key fields from the correct columns
        const bookerName = bookerIndex >= 0 ? row[bookerIndex] || '' : '';
        const bookingCode = bookingCodeIndex >= 0 ? row[bookingCodeIndex] || '' : '';
        const totalQuantity = totalQtyIndex >= 0 ? parseInt(row[totalQtyIndex]) || 1 : 1;
        const itemDetails = itemIndex >= 0 ? row[itemIndex] || '' : '';
        const notes = noteIndex >= 0 ? row[noteIndex] || '' : '';

        const guestRecord = {
          guest_list_id: guestList.id,
          booking_code: bookingCode,
          booker_name: bookerName,
          total_quantity: totalQuantity,
          show_time: '', // This can be extracted from item details if needed
          item_details: itemDetails,
          notes: notes,
          ticket_data: ticketData,
          original_row_index: index
        };
        
        // Log the first few records to debug
        if (index < 3) {
          console.log(`Guest record ${index}:`, guestRecord);
        }
        
        return guestRecord;
      });

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
        description: `Uploaded ${csvData.rows.length} guests successfully`,
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
