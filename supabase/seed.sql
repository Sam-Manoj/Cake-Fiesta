-- Insert Batches
INSERT INTO batches (id, name, cutoff_date, timezone, active) VALUES
('b1000000-0000-0000-0000-000000000001', 'Batch 1 (Pre-Christmas)', '2026-12-22', 'Asia/Kolkata', true),
('b1000000-0000-0000-0000-000000000002', 'Batch 2 (Christmas & New Year)', '2026-12-23', 'Asia/Kolkata', true);

-- Insert Master Cakes
INSERT INTO cakes (id, name, slug, category, description, shelf_life, is_available) VALUES
('c1000000-0000-0000-0000-000000000001', 'Dates Plum Cake', 'dates-plum-cake', 'Plum Cakes', 'Traditional rich fruit cake soaked in premium rum and loaded with dates.', '10 days in ambient / 20 days refrigerated', true),
('c1000000-0000-0000-0000-000000000002', 'Classic Plum Cake', 'classic-plum-cake', 'Plum Cakes', 'Classic moist fruit plum cake baked with traditional spices and mixed fruits.', '10 days in ambient / 20 days refrigerated', true),
('c1000000-0000-0000-0000-000000000003', 'Butter Scotch Cake', 'butter-scotch-cake', 'Butter Scotch', 'Sweet butterscotch crunch cake with rich caramel layering.', '5 days refrigerated', true),
('c1000000-0000-0000-0000-000000000004', 'Pineapple Cake', 'pineapple-cake', 'Pineapple', 'Fresh pineapple infused celebration cake with light vanilla cream.', '3 days refrigerated', true),
('c1000000-0000-0000-0000-000000000005', 'Jackfruit Cake', 'jackfruit-cake', 'Specialty', 'Unique regional jackfruit specialty cake with authentic flavor notes.', '7 days in ambient', true);

-- Insert Variants for Each Cake
INSERT INTO cake_variants (cake_id, weight, church_rate, mrp, stock, sku) VALUES
-- Dates Plum Variants
('c1000000-0000-0000-0000-000000000001', '350 gms', 214.00, 250.00, 50, 'DATES-350'),
('c1000000-0000-0000-0000-000000000001', '500 gms', 298.00, 327.00, 40, 'DATES-500'),
('c1000000-0000-0000-0000-000000000001', '700 gms', 420.00, 485.00, 30, 'DATES-700'),

-- Classic Plum Variants
('c1000000-0000-0000-0000-000000000002', '350 gms', 198.00, 233.00, 60, 'PLUM-350'),
('c1000000-0000-0000-0000-000000000002', '500 gms', 264.00, 305.00, 50, 'PLUM-500'),
('c1000000-0000-0000-0000-000000000002', '700 gms', 320.00, 351.00, 25, 'PLUM-700'),

-- Butter Scotch Variants
('c1000000-0000-0000-0000-000000000003', '500 gms', 315.00, 361.00, 35, 'BSCOTCH-500'),
('c1000000-0000-0000-0000-000000000003', '700 gms', 435.00, 495.00, 20, 'BSCOTCH-700'),

-- Pineapple Variants
('c1000000-0000-0000-0000-000000000004', '500 gms', 315.00, 361.00, 40, 'PINE-500'),
('c1000000-0000-0000-0000-000000000004', '700 gms', 435.00, 495.00, 25, 'PINE-700'),

-- Jackfruit Variant
('c1000000-0000-0000-0000-000000000005', '275 gms', 275.00, 317.00, 15, 'JACK-275');