import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const PIZZA_OPTIONS = [
  { value: 'margherita', label: '🍕 Margherita' },
  { value: 'spicy-italian', label: '🌶️ Spicy Italian' },
  { value: 'hawaiian', label: '🍍 Hawaiian' },
  { value: 'bbq-chicken', label: '🍗 BBQ Chicken' },
  { value: 'pepperoni', label: '🔴 Pepperoni' },
  { value: 'farmhouse', label: '🌾 Farmhouse' },
  { value: 'mushroom-truffle', label: '🍄 Mushroom & Truffle Oil' },
  { value: 'mediterranean-veg', label: '🥗 Mediterranean Vegetable' },
  { value: 'garlic-pizza', label: '🧄 Garlic Pizza' }
];

interface PizzaOrderDropdownProps {
  guestId: string;
  guestIndex: number;
  currentSelection: string[];
  onSelectionChange: (guestIndex: number, pizzas: string[]) => Promise<void>;
  disabled?: boolean;
}

export const PizzaOrderDropdown = ({
  guestIndex,
  currentSelection,
  onSelectionChange,
  disabled = false
}: PizzaOrderDropdownProps) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async (pizzaValue: string) => {
    if (isUpdating || disabled) return;
    
    setIsUpdating(true);
    try {
      const newSelection = currentSelection.includes(pizzaValue)
        ? currentSelection.filter(p => p !== pizzaValue)
        : [...currentSelection, pizzaValue];
      
      await onSelectionChange(guestIndex, newSelection);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClearAll = async () => {
    if (isUpdating || disabled) return;
    
    setIsUpdating(true);
    try {
      await onSelectionChange(guestIndex, []);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={disabled || isUpdating}
          className="h-8 text-xs"
        >
          {currentSelection.length === 0 ? (
            'Select Pizzas'
          ) : (
            <>
              <Badge variant="secondary" className="mr-1">
                {currentSelection.length}
              </Badge>
              Pizza{currentSelection.length !== 1 ? 's' : ''} Selected
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-64 bg-background border-border z-50" 
        align="start"
      >
        <div className="p-2 text-xs font-semibold text-muted-foreground">
          Select Pizzas for Interval
        </div>
        <DropdownMenuSeparator />
        {PIZZA_OPTIONS.map((pizza) => (
          <DropdownMenuCheckboxItem
            key={pizza.value}
            checked={currentSelection.includes(pizza.value)}
            onCheckedChange={() => handleToggle(pizza.value)}
            disabled={isUpdating}
            className="cursor-pointer"
          >
            <span className="flex items-center justify-between w-full">
              {pizza.label}
              {currentSelection.includes(pizza.value) && (
                <Check className="h-4 w-4 ml-2" />
              )}
            </span>
          </DropdownMenuCheckboxItem>
        ))}
        {currentSelection.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                disabled={isUpdating}
                className="w-full h-7 text-xs"
              >
                Clear All
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const formatPizzaName = (pizzaValue: string): string => {
  const pizzaMap: Record<string, string> = {
    'margherita': '🍕 Margherita',
    'spicy-italian': '🌶️ Spicy Italian',
    'hawaiian': '🍍 Hawaiian',
    'bbq-chicken': '🍗 BBQ Chicken',
    'pepperoni': '🔴 Pepperoni',
    'farmhouse': '🌾 Farmhouse',
    'mushroom-truffle': '🍄 Mushroom & Truffle',
    'mediterranean-veg': '🥗 Mediterranean Veg',
    'garlic-pizza': '🧄 Garlic Pizza'
  };
  return pizzaMap[pizzaValue] || pizzaValue;
};
