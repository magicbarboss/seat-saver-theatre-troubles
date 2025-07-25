import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Guest {
  [key: string]: any;
  id: string;
  booking_code: string;
  booker_name: string;
  total_quantity: number;
  show_time?: string;
  diet_info?: string;
  magic_info?: string;
  ticket_data?: any;
}

interface ManualEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  guest: Guest | null;
  onSave: (guestId: string, updates: Partial<Guest>) => Promise<void>;
}

const commonTicketTypes = [
  'House Magicians Show Ticket',
  'House Magicians Show Ticket & 1 Pizza',
  'House Magicians Show Ticket & 2 Drinks',
  'House Magicians Show Ticket & 2 soft drinks',
  'House Magicians Show Ticket includes 2 Drinks + 1 Pizza',
  'Smoke Offer Ticket & 1x Drink (minimum x2 people)',
  'Groupon Magic & Pints Package (per person)',
  'Groupon Magic & Cocktails Package (per person)',
  'Groupon Offer Prosecco Package (per person)',
  'Wowcher Magic & Cocktails Package (per person)',
];

export const ManualEditDialog = ({ isOpen, onClose, guest, onSave }: ManualEditDialogProps) => {
  const [formData, setFormData] = useState({
    booker_name: '',
    total_quantity: 1,
    show_time: '',
    diet_info: '',
    magic_info: '',
    ticket_type: '',
    custom_ticket_type: '',
    manual_order_summary: ''
  });
  const [isCustomTicket, setIsCustomTicket] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (guest && isOpen) {
      setFormData({
        booker_name: guest.booker_name || '',
        total_quantity: guest.total_quantity || 1,
        show_time: guest.show_time || '',
        diet_info: guest.diet_info || '',
        magic_info: guest.magic_info || '',
        ticket_type: '',
        custom_ticket_type: '',
        manual_order_summary: guest.ticket_data?.manual_order_summary || ''
      });
      setIsCustomTicket(false);
    }
  }, [guest, isOpen]);

  const handleSave = async () => {
    if (!guest) return;
    
    setIsSaving(true);
    try {
      const updates: Partial<Guest> = {
        booker_name: formData.booker_name,
        total_quantity: formData.total_quantity,
        show_time: formData.show_time,
        diet_info: formData.diet_info || null,
        magic_info: formData.magic_info || null,
        manual_override: true, // Flag to prevent automatic processing override
      };

      // Handle manual order summary (for Viator bookings)
      if (formData.manual_order_summary.trim()) {
        console.log(`🔧 Saving manual order summary for ${guest.booker_name}:`, formData.manual_order_summary.trim());
        const newTicketData = {
          ...guest.ticket_data,
          manual_order_summary: formData.manual_order_summary.trim()
        };
        updates.ticket_data = newTicketData;
      }

      // If a ticket type was selected, update the ticket_data
      const ticketType = isCustomTicket ? formData.custom_ticket_type : formData.ticket_type;
      if (ticketType) {
        const newTicketData = {
          ...guest.ticket_data,
          extracted_tickets: {
            [ticketType]: formData.total_quantity
          }
        };
        // Clear old ticket types
        commonTicketTypes.forEach(type => {
          if (type !== ticketType) {
            newTicketData[type] = '';
          }
        });
        newTicketData[ticketType] = formData.total_quantity.toString();
        
        updates.ticket_data = { ...updates.ticket_data, ...newTicketData };
      }

      await onSave(guest.id, updates);
      onClose();
    } catch (error) {
      console.error('Error saving guest updates:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!guest) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Guest: {guest.booker_name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="booker_name">Guest Name</Label>
            <Input
              id="booker_name"
              value={formData.booker_name}
              onChange={(e) => setFormData(prev => ({ ...prev, booker_name: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="total_quantity">Number of Guests</Label>
            <Input
              id="total_quantity"
              type="number"
              min="1"
              value={formData.total_quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, total_quantity: parseInt(e.target.value) || 1 }))}
            />
          </div>

          <div>
            <Label htmlFor="show_time">Show Time</Label>
            <Input
              id="show_time"
              value={formData.show_time}
              onChange={(e) => setFormData(prev => ({ ...prev, show_time: e.target.value }))}
              placeholder="e.g., 7pm"
            />
          </div>

          <div>
            <Label htmlFor="ticket_type">Correct Ticket Type (Optional)</Label>
            <Select 
              value={isCustomTicket ? 'custom' : formData.ticket_type} 
              onValueChange={(value) => {
                if (value === 'custom') {
                  setIsCustomTicket(true);
                  setFormData(prev => ({ ...prev, ticket_type: '' }));
                } else {
                  setIsCustomTicket(false);
                  setFormData(prev => ({ ...prev, ticket_type: value, custom_ticket_type: '' }));
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select ticket type to correct" />
              </SelectTrigger>
              <SelectContent>
                {commonTicketTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
                <SelectItem value="custom">Custom Ticket Type</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isCustomTicket && (
            <div>
              <Label htmlFor="custom_ticket_type">Custom Ticket Type</Label>
              <Input
                id="custom_ticket_type"
                value={formData.custom_ticket_type}
                onChange={(e) => setFormData(prev => ({ ...prev, custom_ticket_type: e.target.value }))}
                placeholder="Enter custom ticket type"
              />
            </div>
          )}

          <div>
            <Label htmlFor="diet_info">Dietary Info</Label>
            <Textarea
              id="diet_info"
              value={formData.diet_info}
              onChange={(e) => setFormData(prev => ({ ...prev, diet_info: e.target.value }))}
              placeholder="Any dietary requirements"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="magic_info">Magic Show Message</Label>
            <Textarea
              id="magic_info"
              value={formData.magic_info}
              onChange={(e) => setFormData(prev => ({ ...prev, magic_info: e.target.value }))}
              placeholder="Any special messages for the magic show"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="manual_order_summary">Manual Order Summary (Viator Only)</Label>
            <Textarea
              id="manual_order_summary"
              value={formData.manual_order_summary}
              onChange={(e) => setFormData(prev => ({ ...prev, manual_order_summary: e.target.value }))}
              placeholder="e.g., 2 Proseccos, 1 Pizza, 1 Fries"
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};