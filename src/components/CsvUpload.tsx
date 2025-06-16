
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload } from 'lucide-react';

interface CsvData {
  headers: string[];
  rows: string[][];
}

const CsvUpload = () => {
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length === 0) return;

      const headers = lines[0].split(',').map(header => header.trim());
      const rows = lines.slice(1).map(line => 
        line.split(',').map(cell => cell.trim())
      );

      setCsvData({ headers, rows });
    };

    reader.readAsText(file);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <Label htmlFor="csv-upload">Upload Your Theatre CSV File</Label>
        <div className="flex items-center space-x-2">
          <Input
            id="csv-upload"
            type="file"
            accept=".csv"
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
      </div>

      {csvData && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">CSV Contents</h3>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  {csvData.headers.map((header, index) => (
                    <TableHead key={index}>{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvData.rows.slice(0, 10).map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <TableCell key={cellIndex}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {csvData.rows.length > 10 && (
              <p className="text-sm text-muted-foreground p-4 border-t">
                Showing first 10 rows of {csvData.rows.length} total rows
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CsvUpload;
