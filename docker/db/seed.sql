-- Sample data for the local Docker database, loaded once when its volume is
-- empty. Mirrors src/lib/db/seed.ts (which seeds a remote database), so keep
-- the two in step.

INSERT INTO cafes (name, address, lat, lng) VALUES
  ('The Pier Kiosk',        'Teignmouth Pier, Den Promenade', 50.5474, -3.4931),
  ('Den Coffee House',      'Den Crescent, Teignmouth',       50.5459, -3.4948),
  ('Back Beach Roasters',   'Teign Street, Teignmouth',       50.5495, -3.5006),
  ('Triangle Espresso Bar', 'The Triangle, Teignmouth',       50.5468, -3.4979);

INSERT INTO reviews (cafe_id, type, worth_it, rating, cost, notes)
SELECT c.id, v.type::review_type, v.worth_it::worth_it, v.rating, v.cost, v.notes
FROM (VALUES
  ('The Pier Kiosk',        'machine', 'no',  2.5, 3.20, 'Convenient by the sea but a bit bitter.'),
  ('Den Coffee House',      'barista', 'yes', 4.5, 3.40, 'Silky microfoam, well balanced.'),
  ('Back Beach Roasters',   'barista', 'yes', 5.0, 3.60, 'Best in town — house-roasted beans.'),
  ('Triangle Espresso Bar', 'barista', 'yes', 4.0, 3.30, 'Solid, consistent flat white.'),
  ('Den Coffee House',      'barista', 'no',  3.0, 3.80, 'Off day — a touch pricey for what it was.')
) AS v(cafe, type, worth_it, rating, cost, notes)
JOIN cafes c ON c.name = v.cafe;
