import React from 'react';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, User, Radio, MessageSquare } from 'lucide-react';

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
}

interface GuestRowProps {
  guest: Guest;
  index: number;
  isCheckedIn: boolean;
  isSeated: boolean;
  isAllocated: boolean;
  pagerNumber?: number;
  tableNumbers: number[];
  pizzaInfo: string;
  drinksInfo: string;
  comment?: string;
  isWalkIn?: boolean;
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
}

export const GuestRow = ({
  guest,
  index,
  isCheckedIn,
  isSeated,
  isAllocated,
  pagerNumber,
  tableNumbers,
  pizzaInfo,
  drinksInfo,
  comment,
  isWalkIn,
  partyInfo,
  onCheckIn,
  onPagerAction,
  onTableAllocate,
  onSeat,
  onComment
}: GuestRowProps) => {
  const guestName = guest.booker_name || 'Unknown Guest';
  const guestCount = guest.total_quantity || 1;
  const showTime = guest.show_time || guest['Show time'] || 'N/A';

  return (
    <TableRow className={`${isCheckedIn ? 'bg-green-50 dark:bg-green-950/20' : ''} ${isWalkIn ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {isWalkIn && <Badge variant="secondary">Walk-in</Badge>}
          {guestName}
          {partyInfo?.isInParty && (
            <Badge variant="outline" className="text-xs">
              Party of {partyInfo.partySize}
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
        <div className="space-y-1">
          {pizzaInfo && <div className="text-sm text-orange-600">{pizzaInfo}</div>}
          {drinksInfo && <div className="text-sm text-blue-600">{drinksInfo}</div>}
        </div>
      </TableCell>

      <TableCell>
        <Button
          variant={isCheckedIn ? "default" : "outline"}
          size="sm"
          onClick={() => onCheckIn(index)}
          className={isCheckedIn ? "bg-green-600 hover:bg-green-700" : ""}
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          {isCheckedIn ? "Checked In" : "Check In"}
        </Button>
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