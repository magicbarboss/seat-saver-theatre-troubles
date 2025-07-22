
import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RotateCcw, Trash2, AlertTriangle, Link } from 'lucide-react';
import { ManualLinkDialog } from './ManualLinkDialog';
import { BookingGroup } from './types';

interface CheckInActionsProps {
  onRefreshStatus: () => void;
  onClearData: () => void;
  showClearDialog: boolean;
  setShowClearDialog: (show: boolean) => void;
  bookingGroups: BookingGroup[];
  checkedInGuests: Set<number>;
  manualLinks: Map<string, number[]>;
  onCreateManualLink: (guestIndices: number[]) => void;
  onRemoveManualLink: (linkId: string) => void;
  extractGuestName: (name: string) => string;
}

export const CheckInActions = ({
  onRefreshStatus,
  onClearData,
  showClearDialog,
  setShowClearDialog,
  bookingGroups,
  checkedInGuests,
  manualLinks,
  onCreateManualLink,
  onRemoveManualLink,
  extractGuestName
}: CheckInActionsProps) => {
  return (
    <div className="flex gap-2 mb-4">
      <Button
        variant="outline"
        size="sm"
        onClick={onRefreshStatus}
        className="flex items-center gap-2"
      >
        <RotateCcw className="h-4 w-4" />
        Refresh Status
      </Button>

      <ManualLinkDialog
        bookingGroups={bookingGroups}
        checkedInGuests={checkedInGuests}
        manualLinks={manualLinks}
        onCreateLink={onCreateManualLink}
        onRemoveLink={onRemoveManualLink}
        extractGuestName={extractGuestName}
      />

      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Clear All Data
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Clear All Check-in Data?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              This will permanently delete all check-in data for today, including:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>All check-in statuses</li>
              <li>Table assignments and allocations</li>
              <li>Pager assignments</li>
              <li>Seating information</li>
              <li>Party connections</li>
              <li>Manual guest links</li>
              <li>Walk-in guests</li>
              <li>Comments</li>
            </ul>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowClearDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={onClearData}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Data
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
