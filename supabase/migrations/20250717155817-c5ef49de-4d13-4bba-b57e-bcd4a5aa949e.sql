-- More aggressive cleanup for Denise O'Keeffe - delete ALL records and keep only the correct one
DELETE FROM guests 
WHERE booker_name = 'Denise O''Keeffe' 
AND booking_code = 'VMLK-010725';

-- Insert the single correct record back
INSERT INTO guests (
  id, guest_list_id, booking_code, booker_name, total_quantity, ticket_data, show_time, diet_info
) VALUES (
  '2b75cab9-5407-45d1-8d92-a6783a8daaa8',
  '013ae903-b3e7-4447-bc02-ff1d58f8e83b',
  'VMLK-010725',
  'Denise O''Keeffe',
  4,
  '{"Booker": "Denise O''Keeffe", "Booking": "", "Booking Code": "VMLK-010725", "DIET": "We LOVE MAGIC & COMEDY", "Friends": "Denise O''Keeffe", "Groupon Magic & Cocktails Package (per person)": "", "Groupon Magic & Pints Package (per person)": "", "Groupon Offer Prosecco Package (per person)": "Paid", "Guests": "", "House Magicians Show Ticket": "", "House Magicians Show Ticket & 1 Pizza": "", "House Magicians Show Ticket & 2 Drinks": "Lori & Steve", "House Magicians Show Ticket & 2 soft drinks": "", "House Magicians Show Ticket includes 2 Drinks +  1 Pizza": "", "Item": "The House Magicians Comedy & Magic Show [7:00pm]", "Magic": "", "Note": "", "Smoke Offer Ticket & 1x Drink (minimum x2 people)": "", "Status": "Dan", "Total": "125", "Total Quantity": "4", "Wowcher Magic & Cocktails Package (per person)": "", "extracted_tickets": {"House Magicians Show Ticket & 2 Drinks": 4}}',
  '7pm',
  NULL
);