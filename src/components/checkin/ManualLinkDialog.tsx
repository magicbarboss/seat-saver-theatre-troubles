import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Users, Link, Unlink, Trash2 } from 'lucide-react';
import { BookingGroup } from './types';

interface ManualLinkDialogProps {
  bookingGroups: BookingGroup[];
  checkedInGuests: Set<number>;
  manualLinks: Map<string, number[]>;
  friendshipGroups: Map<string, number[]>;
  onCreateLink: (guestIndices: number[]) => void;
  onRemoveLink: (linkId: string) => void;
  extractGuestName: (name: string, ticketData?: any) => string;
}

export const ManualLinkDialog = ({
  bookingGroups,
  checkedInGuests,
  manualLinks,
  friendshipGroups,
  onCreateLink,
  onRemoveLink,
  extractGuestName
}: ManualLinkDialogProps) => {
  const [selectedGuests, setSelectedGuests] = useState<Set<number>>(new Set());
  const [isOpen, setIsOpen] = useState(false);

  const handleGuestSelection = (guestIndex: number, checked: boolean) => {
    const newSelection = new Set(selectedGuests);
    if (checked) {
      newSelection.add(guestIndex);
    } else {
      newSelection.delete(guestIndex);
    }
    setSelectedGuests(newSelection);
  };

  const handleCreateLink = () => {
    if (selectedGuests.size >= 2) {
      onCreateLink(Array.from(selectedGuests));
      setSelectedGuests(new Set());
    }
  };

  // Get checked-in guests that are not already manually linked
  const availableGuests = bookingGroups.filter(booking => {
    if (!checkedInGuests.has(booking.originalIndex)) return false;
    
    // Check if this guest is already in a manual link
    const isAlreadyLinked = Array.from(manualLinks.values()).some(group => 
      group.includes(booking.originalIndex)
    );
    
    return !isAlreadyLinked;
  });

  // Get guest name by index for display in existing links
  const getGuestNameByIndex = (index: number): string => {
    const booking = bookingGroups.find(b => b.originalIndex === index);
    return booking ? extractGuestName(booking.mainBooking.booker_name || '', booking.mainBooking.ticket_data) : 'Unknown Guest';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Link className="h-4 w-4" />
          Link Guests
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manual Guest Linking
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Existing Manual Links */}
          {manualLinks.size > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Current Manual Links:</h4>
              {Array.from(manualLinks.entries()).map(([linkId, guestIndices]) => (
                <div key={linkId} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <div className="flex flex-wrap gap-1">
                      {guestIndices.map((index, i) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {getGuestNameByIndex(index)}
                          {i < guestIndices.length - 1 && ','}
                        </Badge>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      (Group of {guestIndices.length})
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRemoveLink(linkId)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Unlink className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Friendship Groups */}
          {friendshipGroups.size > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Detected Friendship Groups:</h4>
              <p className="text-xs text-muted-foreground">
                These groups were automatically detected from the guest data.
              </p>
              {Array.from(friendshipGroups.entries()).map(([groupName, guestIndices]) => (
                <div key={groupName} className="flex items-center gap-2 p-3 border rounded-lg bg-green-50/50 border-green-200">
                  <Users className="h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <div className="font-medium text-sm text-green-800">{groupName}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {guestIndices.map((index, i) => (
                        <Badge key={index} variant="outline" className="text-xs border-green-300 text-green-700">
                          {getGuestNameByIndex(index)}
                          {i < guestIndices.length - 1 && ','}
                        </Badge>
                      ))}
                    </div>
                    <span className="text-xs text-green-600">
                      (Group of {guestIndices.length})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create New Link */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Create New Link:</h4>
            <p className="text-xs text-muted-foreground">
              Select 2 or more checked-in guests to link them together for seating purposes.
            </p>

            {availableGuests.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No available guests to link.</p>
                <p className="text-xs">Guests must be checked in and not already linked.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableGuests.map((booking) => (
                  <div
                    key={booking.originalIndex}
                    className="flex items-center space-x-3 p-2 border rounded hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedGuests.has(booking.originalIndex)}
                      onCheckedChange={(checked) => 
                        handleGuestSelection(booking.originalIndex, checked === true)
                      }
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {extractGuestName(booking.mainBooking.booker_name || '', booking.mainBooking.ticket_data)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {booking.mainBooking.total_quantity || 1} guests • {booking.mainBooking.show_time || '7pm'}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Table {booking.originalIndex + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {selectedGuests.size > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm text-blue-800">
                  {selectedGuests.size} guests selected
                </span>
                <Button
                  onClick={handleCreateLink}
                  disabled={selectedGuests.size < 2}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Link className="h-3 w-3 mr-1" />
                  Create Link
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
