
/**
 * Utility functions for extracting and normalizing show times from various text formats
 */

export const extractShowTimeFromText = (text: string): string | null => {
  if (!text) return null;
  
  // Common time patterns to match
  const timePatterns = [
    // [8:00pm], [7pm], [9:30pm] - brackets format
    /\[(\d{1,2}(?::\d{2})?\s*(?:pm|am))\]/i,
    // 8:00pm, 7pm, 9:30pm - standalone format
    /(\d{1,2}(?::\d{2})?\s*(?:pm|am))\b/i,
    // 20:00, 19:30 - 24-hour format
    /(\d{1,2}:\d{2})\b/,
    // Show at 8pm, Show at 7:30pm
    /show\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:pm|am))/i,
    // Time: 8pm, Time: 7:30pm
    /time:\s*(\d{1,2}(?::\d{2})?\s*(?:pm|am))/i
  ];
  
  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      return normalizeShowTime(match[1]);
    }
  }
  
  return null;
};

export const normalizeShowTime = (timeStr: string): string => {
  if (!timeStr) return '';
  
  // Remove extra whitespace and convert to lowercase
  const cleaned = timeStr.trim().toLowerCase();
  
  // Convert 24-hour format to 12-hour format
  if (cleaned.match(/^\d{1,2}:\d{2}$/)) {
    const [hours, minutes] = cleaned.split(':').map(Number);
    if (hours >= 12) {
      const displayHour = hours === 12 ? 12 : hours - 12;
      return minutes === 0 ? `${displayHour}pm` : `${displayHour}:${minutes.toString().padStart(2, '0')}pm`;
    } else {
      const displayHour = hours === 0 ? 12 : hours;
      return minutes === 0 ? `${displayHour}am` : `${displayHour}:${minutes.toString().padStart(2, '0')}am`;
    }
  }
  
  // Normalize 12-hour format (remove spaces, ensure consistent format)
  const normalizedTime = cleaned
    .replace(/\s+/g, '') // Remove all spaces
    .replace(/(\d+):00(am|pm)/, '$1$2') // Remove :00 from times like 8:00pm -> 8pm
    .replace(/(\d+)(am|pm)/, '$1$2'); // Ensure no space between number and am/pm
  
  return normalizedTime;
};

export const isValidShowTime = (timeStr: string): boolean => {
  if (!timeStr) return false;
  
  // Check if it matches common show time patterns
  const validPatterns = [
    /^\d{1,2}(:\d{2})?(am|pm)$/i, // 8pm, 8:30pm, 12am, etc.
    /^\d{1,2}:\d{2}$/ // 20:00, 19:30, etc.
  ];
  
  return validPatterns.some(pattern => pattern.test(timeStr.trim()));
};
