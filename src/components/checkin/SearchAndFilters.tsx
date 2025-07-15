import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

interface SearchAndFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showFilter: string;
  setShowFilter: (show: string) => void;
  showTimes: string[];
}

export const SearchAndFilters = ({
  searchTerm,
  setSearchTerm,
  showFilter,
  setShowFilter,
  showTimes
}: SearchAndFiltersProps) => {
  return (
    <div className="flex gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search guests..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      <Select value={showFilter} onValueChange={setShowFilter}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filter by show time" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Shows</SelectItem>
          {showTimes.map((time) => (
            <SelectItem key={time} value={time}>
              {time}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};