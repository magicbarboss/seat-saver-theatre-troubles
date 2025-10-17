import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
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

  // Count occurrences of each pizza
  const getQuantity = (pizzaValue: string): number => {
    return currentSelection.filter(p => p === pizzaValue).length;
  };

  const handleIncrement = async (pizzaValue: string) => {
    if (isUpdating || disabled) return;
    
    setIsUpdating(true);
    try {
      const newSelection = [...currentSelection, pizzaValue];
      await onSelectionChange(guestIndex, newSelection);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDecrement = async (pizzaValue: string) => {
    if (isUpdating || disabled) return;
    
    setIsUpdating(true);
    try {
      const index = currentSelection.indexOf(pizzaValue);
      if (index > -1) {
        const newSelection = [...currentSelection];
        newSelection.splice(index, 1);
        await onSelectionChange(guestIndex, newSelection);
      }
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

  const totalPizzas = currentSelection.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={disabled || isUpdating}
          className="h-8 text-xs"
        >
          {totalPizzas === 0 ? (
            'Select Pizzas'
          ) : (
            <>
              <Badge variant="secondary" className="mr-1">
                {totalPizzas}
              </Badge>
              Pizza{totalPizzas !== 1 ? 's' : ''} Selected
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-72 bg-background border-border z-50" 
        align="start"
      >
        <div className="p-2 text-xs font-semibold text-muted-foreground">
          Select Pizzas for Interval
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {PIZZA_OPTIONS.map((pizza) => {
            const quantity = getQuantity(pizza.value);
            return (
              <div
                key={pizza.value}
                className="flex items-center justify-between px-2 py-2 hover:bg-accent"
              >
                <span className="text-sm flex-1">{pizza.label}</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDecrement(pizza.value)}
                    disabled={isUpdating || quantity === 0}
                    className="h-7 w-7 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-sm font-medium w-6 text-center">
                    {quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleIncrement(pizza.value)}
                    disabled={isUpdating}
                    className="h-7 w-7 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        {totalPizzas > 0 && (
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
