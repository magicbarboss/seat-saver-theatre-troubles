import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Users } from 'lucide-react';
import { CheckedInGuest } from '../checkin/types';

interface FriendshipGroupProps {
  id: string;
  members: CheckedInGuest[];
  onGroupAssign: (members: CheckedInGuest[]) => void;
  isSelected: boolean;
}

export const FriendshipGroup: React.FC<FriendshipGroupProps> = ({
  id,
  members,
  onGroupAssign,
  isSelected
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const totalGuests = members.reduce((sum, member) => sum + member.count, 0);
  const showTimes = Array.from(new Set(members.map(m => m.showTime))).join(', ');
  const primaryName = members[0]?.name || 'Group';

  return (
    <div 
      className={`p-3 border-2 rounded-lg transition-all cursor-pointer ${
        isSelected 
          ? 'border-primary bg-primary/5' 
          : 'border-border bg-card hover:bg-accent'
      }`}
      onClick={() => onGroupAssign(members)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <div>
            <div className="font-medium">{primaryName} & Friends</div>
            <div className="text-sm text-muted-foreground">
              {totalGuests} guests • {showTimes}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{members.length}</Badge>
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </div>
      
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent className="mt-2">
          <div className="space-y-1 pl-4 border-l-2 border-primary/20">
            {members.map((member, index) => (
              <div key={member.originalIndex} className="text-sm">
                <span className="font-medium">{member.name}</span>
                <span className="text-muted-foreground"> ({member.count} guests)</span>
                {member.isWalkIn && (
                  <Badge variant="outline" className="ml-2 text-xs">Walk-in</Badge>
                )}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};