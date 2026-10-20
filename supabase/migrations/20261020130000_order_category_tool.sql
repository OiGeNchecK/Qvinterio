-- Tools (Werkzeuge) as their own order category, next to rented equipment.
alter type public.order_category add value if not exists 'tool' before 'other';
