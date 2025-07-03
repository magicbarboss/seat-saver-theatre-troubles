
export interface PackageInfo {
  type: string;
  name: string;
  color: string;
}

export const extractPackageInfo = (ticketData: any): PackageInfo | null => {
  if (!ticketData || typeof ticketData !== 'object') return null;

  const packageFields = Object.keys(ticketData).filter(key => 
    key.includes('Package') || key.includes('Groupon') || key.includes('Wowcher')
  );

  if (packageFields.length === 0) return null;

  const packageField = packageFields[0];
  
  if (packageField.includes('Groupon')) {
    if (packageField.includes('Cocktails')) {
      return { type: 'Groupon', name: 'Magic & Cocktails', color: 'bg-green-100 text-green-800 border-green-200' };
    } else if (packageField.includes('Pints')) {
      return { type: 'Groupon', name: 'Magic & Pints', color: 'bg-amber-100 text-amber-800 border-amber-200' };
    } else if (packageField.includes('OLD')) {
      return { type: 'Groupon', name: 'Old Groupon', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    }
    return { type: 'Groupon', name: 'Magic Package', color: 'bg-green-100 text-green-800 border-green-200' };
  }
  
  if (packageField.includes('Wowcher')) {
    return { type: 'Wowcher', name: 'Magic & Cocktails', color: 'bg-pink-100 text-pink-800 border-pink-200' };
  }

  return { type: 'Package', name: 'Magic Show', color: 'bg-blue-100 text-blue-800 border-blue-200' };
};

export const getGuestCount = (guest: any): number => {
  // First try database field
  if (guest.total_quantity && guest.total_quantity > 0) {
    return guest.total_quantity;
  }
  
  // Fall back to ticket data
  if (guest.ticket_data && typeof guest.ticket_data === 'object') {
    const totalQuantity = guest.ticket_data['Total Quantity'] || 
                         guest.ticket_data['total_quantity'] ||
                         guest.ticket_data['Quantity'];
    if (totalQuantity && !isNaN(parseInt(totalQuantity))) {
      return parseInt(totalQuantity);
    }
  }
  
  return 1; // Default fallback
};

export const getShowTimeDisplay = (showTime: string): string => {
  if (!showTime) return '';
  
  // Convert numeric show times to readable format
  switch (showTime) {
    case '1':
    case '7':
      return '7pm';
    case '2':
    case '9':
      return '9pm';
    default:
      return showTime;
  }
};

export const getPriorityHeaders = (ticketData: any): { header: string; value: any }[] => {
  if (!ticketData || typeof ticketData !== 'object') return [];
  
  const priorityFields = [
    'Booking Code',
    'booking_code',
    'Diet',
    'Dietary Requirements',
    'Special Requirements',
    'Notes',
    'Comments',
    'Phone',
    'Email'
  ];
  
  const headers: { header: string; value: any }[] = [];
  
  // Add priority fields first
  priorityFields.forEach(field => {
    if (ticketData[field] && ticketData[field] !== '' && ticketData[field] !== 'N/A') {
      headers.push({ header: field, value: ticketData[field] });
    }
  });
  
  // Add other non-empty fields
  Object.keys(ticketData).forEach(key => {
    if (!priorityFields.includes(key) && 
        !key.includes('Package') && 
        !key.includes('Groupon') && 
        !key.includes('Wowcher') &&
        ticketData[key] && 
        ticketData[key] !== '' && 
        ticketData[key] !== 'N/A') {
      headers.push({ header: key, value: ticketData[key] });
    }
  });
  
  return headers.slice(0, 4); // Limit to 4 most important fields
};
