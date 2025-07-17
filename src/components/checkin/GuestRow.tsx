import React from 'react';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CheckCircle, User, Radio, MessageSquare, Info, AlertTriangle, Sparkles } from 'lucide-react';

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
  orderSummary,
  packageDetails,
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
        <div className="flex items-center gap-2">
          <div className="bg-yellow-50 px-3 py-2 rounded-md border border-yellow-200 text-sm font-medium text-foreground">
            {orderSummary}
          </div>
          
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
                  {packageDetails.length > 0 && packageDetails.some(p => p.details.length > 0) && (
                    <div>
                      <h4 className="font-medium">Additional Info:</h4>
                      {packageDetails.map((pkg, idx) => (
                        pkg.details.length > 0 && (
                          <div key={idx} className="space-y-1">
                            <div className="text-sm font-medium text-muted-foreground">
                              {pkg.type} {pkg.quantity > 1 && `(×${pkg.quantity})`}
                            </div>
                            <ul className="space-y-1">
                              {pkg.details.map((detail, detailIdx) => (
                                <li key={detailIdx} className="text-sm flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                                  {detail}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          ) : null}
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