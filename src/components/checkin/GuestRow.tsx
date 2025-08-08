import React from 'react';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, User, Radio, MessageSquare, Info, AlertTriangle, Sparkles, Edit, Clock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Guest {
  [key: string]: any;
  id: string;
  booking_code: string;
  booker_name: string;
  total_quantity: number;
  is_checked_in: boolean;
  pager_number: number | null;
  table_assignments: number[] | null;
  interval_pizza_order?: boolean;
  interval_drinks_order?: boolean;
  diet_info?: string;
  magic_info?: string;
  ticket_data?: any;
  show_time?: string;
  arriving_late?: boolean;
}


interface GuestRowProps {
  guest: Guest;
  index: number;
  isCheckedIn: boolean;
  isSeated: boolean;
  isAllocated: boolean;
  pagerNumber?: number;
  tableNumbers: number[];
  orderSummary: string;
  packageDetails: Array<{
    type: string;
    quantity: number;
    details: string[];
  }>;
  comment?: string;
  notes?: string;
  isWalkIn?: boolean;
  addOnGuests?: Guest[];
  partyInfo?: {
    isInParty: boolean;
    partySize: number;
    partyMembers: string[];
  };
  onCheckIn: (index: number) => void;
  onPagerAction: (index: number, pagerNumber?: number) => void;
  onTableAllocate: (index: number) => void;
  onSeat: (index: number) => void;
  onComment: (index: number) => void;
  onNotesChange: (index: number, notes: string) => void;
  onManualEdit?: (index: number) => void;
}

export const GuestRow = ({
  guest,
  index,
  isCheckedIn,
  isSeated,
  isAllocated,
  pagerNumber,
  tableNumbers,
  orderSummary,
  packageDetails,
  comment,
  notes,
  isWalkIn,
  addOnGuests,
  partyInfo,
  onCheckIn,
  onPagerAction,
  onTableAllocate,
  onSeat,
  onComment,
  onNotesChange,
  onManualEdit
}: GuestRowProps) => {
  // Extract full name from ticket data if available
  const extractFullName = (guest: Guest) => {
    if (guest.ticket_data) {
      const firstName = guest.ticket_data['First Name'] || guest.ticket_data['first_name'] || '';
      const lastName = guest.ticket_data['Last Name'] || guest.ticket_data['last_name'] || '';
      
      if (firstName && lastName) {
        return `${firstName.trim()} ${lastName.trim()}`;
      } else if (firstName) {
        return firstName.trim();
      } else if (lastName) {
        return lastName.trim();
      }
      
      // Also check for Booker field in ticket data
      if (guest.ticket_data['Booker']) {
        return guest.ticket_data['Booker'].trim();
      }
    }
    
    // Fall back to booker_name if ticket data doesn't have names
    return guest.booker_name || 'Unknown Guest';
  };

  const guestName = extractFullName(guest);
  const guestCount = guest.total_quantity || 1;
  const showTime = guest.show_time || guest['Show time'] || 'N/A';

  // Late arrival state and persistence
  const [arrivingLate, setArrivingLate] = React.useState<boolean>(!!guest.arriving_late);
  React.useEffect(() => {
    setArrivingLate(!!guest.arriving_late);
  }, [guest.arriving_late]);

  const handleToggleLate = async (value: boolean) => {
    setArrivingLate(value);
    const { error } = await supabase
      .from('guests')
      .update({ arriving_late: value })
      .eq('id', guest.id);

    if (error) {
      setArrivingLate(!value);
      toast({ title: 'Update failed', description: 'Could not update late status.', variant: 'destructive' });
    } else {
      toast({ title: value ? 'Marked arriving late' : 'Late status cleared' });
    }
  };

  // Format add-on items for display
  const formatAddOns = (addOns: Guest[]) => {
    const addOnItems: string[] = [];
    const itemCounts = new Map<string, number>(); // Track quantities by item name
    
    addOns.forEach((addon) => {
      const quantity = addon.total_quantity || 1;
      
      // Prioritize actual item/product fields over guest name
      let itemName = addon.item_details ||
                     addon.ticket_data?.Item ||
                     addon.ticket_data?.Package ||
                     addon.ticket_data?.Description ||
                     addon.ticket_data?.Product ||
                     addon.staff_updated_order ||
                     addon.notes ||
                     'Add-on Item';
      
      // Filter out main package items that shouldn't be add-ons
      const mainPackagePatterns = ['magic show', 'comedy', 'show ['];
      const isMainPackage = mainPackagePatterns.some(pattern => 
        itemName.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (isMainPackage) {
        return; // Skip main package items from add-ons display
      }
      
      // Clean up item name - remove show times and extra details
      itemName = itemName
        .replace(/\[.*?\]/g, '') // Remove anything in square brackets like [7:00pm]
        .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
        .trim();                 // Remove leading/trailing whitespace
      
      // Accumulate quantities for the same item name
      const existingCount = itemCounts.get(itemName) || 0;
      itemCounts.set(itemName, existingCount + quantity);
    });
    
    // Convert map back to array format
    itemCounts.forEach((totalQuantity, itemName) => {
      addOnItems.push(`x${totalQuantity} ${itemName}`);
    });
    
    return addOnItems;
  };

  return (
    <TableRow className={`${isCheckedIn ? 'bg-green-50 dark:bg-green-950/20' : ''} ${isWalkIn ? 'bg-blue-50 dark:bg-blue-950/20' : ''} ${partyInfo?.isInParty ? 'bg-accent/10' : ''}`} >
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {isWalkIn && <Badge variant="secondary">Walk-in</Badge>}
          <span className={`text-lg font-semibold transition-colors duration-200 ${
            isCheckedIn 
              ? 'text-success' 
              : isWalkIn 
                ? 'text-info' 
                : 'text-foreground hover:text-primary'
          }`}>
            {guestName}
          </span>
          {partyInfo?.isInParty && (
            <>
              <Badge variant="outline" className="text-xs">Linked</Badge>
              <Badge variant="outline" className="text-xs">Party of {partyInfo.partySize}</Badge>
            </>
          )}
          {arrivingLate && (
            <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
              <Clock className="h-3 w-3 mr-1" />
              Late
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {guest.booking_code && `Code: ${guest.booking_code}`}
        </div>
      </TableCell>
      
      <TableCell className="text-center">{guestCount}</TableCell>
      <TableCell>{showTime}</TableCell>
      
      <TableCell>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="bg-yellow-50 px-3 py-2 rounded-md border border-yellow-200 text-sm font-medium text-foreground">
              {orderSummary}
            </div>
          {onManualEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onManualEdit(index)}
              className="h-6 w-6 p-0"
              title="Edit guest details"
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
          
          {/* Diet Info Badge */}
          {guest.diet_info && (
            <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Diet
            </Badge>
          )}
          
          {/* Magic Info Badge */}
          {guest.magic_info && (
            <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50">
              <Sparkles className="h-3 w-3 mr-1" />
              Magic
            </Badge>
          )}
          
          {(packageDetails.length > 0 && packageDetails.some(p => p.details.length > 0)) || guest.diet_info || guest.magic_info ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Info className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 max-h-80 overflow-y-auto">
                <div className="space-y-3">
                  {guest.diet_info && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Dietary Requirements
                      </h4>
                      <p className="text-sm text-orange-700 bg-orange-50 p-2 rounded border border-orange-200">
                        {guest.diet_info}
                      </p>
                    </div>
                  )}
                  {guest.magic_info && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        Magic Show Message
                      </h4>
                      <p className="text-sm text-purple-700 bg-purple-50 p-2 rounded border border-purple-200">
                        {guest.magic_info}
                      </p>
                    </div>
                  )}
                  {/* Remove package details display - it's showing irrelevant info */}
                </div>
              </PopoverContent>
            </Popover>
           ) : null}
           </div>
           
           {/* Add-ons Section */}
           {addOnGuests && addOnGuests.length > 0 && (
             <div className="bg-blue-50 px-3 py-2 rounded-md border border-blue-200 mt-2">
               <div className="font-medium text-sm text-blue-900 mb-1">Add-ons:</div>
               <div className="space-y-1">
                 {formatAddOns(addOnGuests).map((addOn, idx) => (
                   <div key={idx} className="text-sm text-blue-800">
                     • {addOn}
                   </div>
                 ))}
               </div>
             </div>
           )}
           
           {/* Notes Textarea */}
           <div className="w-full">
             <Textarea
               placeholder="Add your notes here..."
               value={notes || ''}
               onChange={(e) => onNotesChange(index, e.target.value)}
               className="min-h-[60px] text-xs resize-none"
               rows={2}
             />
           </div>
        </div>
      </TableCell>

      <TableCell>
        <div className="space-y-2">
          <Button
            variant={isCheckedIn ? "default" : "outline"}
            size="sm"
            onClick={() => onCheckIn(index)}
            className={isCheckedIn ? "bg-green-600 hover:bg-green-700" : ""}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            {isCheckedIn ? "Checked In" : "Check In"}
          </Button>
          <div className="flex items-center gap-2">
            <Switch checked={arrivingLate} onCheckedChange={handleToggleLate} id={`late-${guest.id}`} />
            <label htmlFor={`late-${guest.id}`} className="text-xs text-muted-foreground">Arriving late</label>
          </div>
        </div>
      </TableCell>

      <TableCell>
        {isCheckedIn && (
          <div className="space-y-1">
            {pagerNumber ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Pager {pagerNumber}</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPagerAction(index)}
                >
                  Release
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPagerAction(index)}
              >
                <Radio className="h-4 w-4 mr-1" />
                Assign Pager
              </Button>
            )}
          </div>
        )}
      </TableCell>

      <TableCell>
        {isCheckedIn && (
          <div className="space-y-1">
            {isAllocated ? (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  {tableNumbers.map((tableNum) => (
                    <Badge key={tableNum} variant="default">
                      Table {tableNum}
                    </Badge>
                  ))}
                </div>
                <Button
                  variant={isSeated ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSeat(index)}
                  className={isSeated ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  <User className="h-4 w-4 mr-1" />
                  {isSeated ? "Seated" : "Mark Seated"}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTableAllocate(index)}
              >
                Allocate Table
              </Button>
            )}
          </div>
        )}
      </TableCell>

      <TableCell>
        <div className="space-y-2">
          {guest.ticket_data?.Booking && (
            <Badge variant="outline" className="text-xs">
              {guest.ticket_data.Booking}
            </Badge>
          )}
          
          {/* Booking Notes */}
          <div className="space-y-1 text-xs text-muted-foreground">
            {guest.magic_info && (
              <div className="flex items-start gap-1">
                <span>•</span>
                <span>{guest.magic_info}</span>
              </div>
            )}
            {notes && notes.trim() && (
              <div className="flex items-start gap-1">
                <span>•</span>
                <span>{notes.trim()}</span>
              </div>
            )}
            {guest.diet_info && guest.diet_info.toLowerCase().includes('celebration') && (
              <div className="flex items-start gap-1">
                <span>•</span>
                <span>{guest.diet_info}</span>
              </div>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onComment(index)}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          {comment && (
            <Badge variant="secondary" className="text-xs">
              Has note
            </Badge>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};