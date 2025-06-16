import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload } from 'lucide-react';
import CheckInSystem from './CheckInSystem';
import * as XLSX from 'xlsx';

interface CsvData {
  headers: string[];
  rows: string[][];
}

const CsvUpload = () => {
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [showCheckIn, setShowCheckIn] = useState(false);

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
        // Handle CSV/TSV files (existing logic)
        const text = data as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length === 0) return;

        const headers = lines[0].split('\t').map(header => header.trim().replace(/"/g, ''));
        const rows = lines.slice(1).map(line => 
          line.split('\t').map(cell => cell.trim().replace(/"/g, ''))
        );

        setCsvData({ headers, rows });
      }
    };

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file);
    }
  };

  if (showCheckIn && csvData) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Button 
            variant="outline" 
            onClick={() => setShowCheckIn(false)}
          >
            ← Back to Upload
          </Button>
          <p className="text-sm text-muted-foreground">
            Using: {fileName}
          </p>
        </div>
        <CheckInSystem 
          guests={csvData.rows.map(row => row.reduce((obj, cell, index) => {
            obj[index] = cell;
            return obj;
          }, {} as { [key: string]: string }))}
          headers={csvData.headers}
        />
      </div>
    );
  }

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
            <Button onClick={() => setShowCheckIn(true)}>
              Start Check-In System
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
                Showing first 10 rows of {csvData.rows.length} total rows. Click "Start Check-In System" for full functionality.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CsvUpload;
