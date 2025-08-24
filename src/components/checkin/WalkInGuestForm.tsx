import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus } from 'lucide-react';

interface WalkInGuestFormProps {
  showTimes: string[];
  onAddWalkIn: (walkInData: {
    name: string;
    count: number;
    showTime: string;
    notes?: string;
  }) => void;
}

export const WalkInGuestForm = ({ showTimes, onAddWalkIn }: WalkInGuestFormProps) => {
  const [walkInDialogOpen, setWalkInDialogOpen] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInCount, setWalkInCount] = useState<number | ''>('');
  const [walkInShowTime, setWalkInShowTime] = useState(showTimes[0] || '');
  const [walkInNotes, setWalkInNotes] = useState('');

  const handleAddWalkIn = () => {
    if (!walkInName.trim()) return;

    onAddWalkIn({
      name: walkInName.trim(),
      count: typeof walkInCount === 'number' ? walkInCount : 1,
      showTime: walkInShowTime,
      notes: walkInNotes.trim() || undefined,
    });

    // Reset form
    setWalkInName('');
    setWalkInCount('');
    setWalkInShowTime(showTimes[0] || '');
    setWalkInNotes('');
    setWalkInDialogOpen(false);
  };

  return (
    <Dialog open={walkInDialogOpen} onOpenChange={setWalkInDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Add Walk-in Guest
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Walk-in Guest</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="walkInName">Guest Name</Label>
            <Input
              id="walkInName"
              value={walkInName}
              onChange={(e) => setWalkInName(e.target.value)}
              placeholder="Enter guest name"
            />
          </div>
          
          <div>
            <Label htmlFor="walkInCount">Number of Guests</Label>
            <Input
              id="walkInCount"
              type="number"
              min="1"
              step="1"
              value={walkInCount}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setWalkInCount('');
                } else {
                  const num = parseInt(value, 10);
                  if (!isNaN(num) && num >= 1) {
                    setWalkInCount(num);
                  }
                }
              }}
              placeholder="Enter number of guests"
            />
          </div>

          <div>
            <Label htmlFor="walkInShowTime">Show Time</Label>
            <Select value={walkInShowTime} onValueChange={setWalkInShowTime}>
              <SelectTrigger>
                <SelectValue placeholder="Select show time" />
              </SelectTrigger>
              <SelectContent>
                {showTimes.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="walkInNotes">Notes (Optional)</Label>
            <Textarea
              id="walkInNotes"
              value={walkInNotes}
              onChange={(e) => setWalkInNotes(e.target.value)}
              placeholder="Any special requirements or notes..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setWalkInDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddWalkIn} disabled={!walkInName.trim() || !walkInCount || walkInCount < 1}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Guest
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};