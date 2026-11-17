-- Update 400g variant weights to explicitly include "Slice" for the filter
UPDATE public.cake_variants
SET weight = '400g Slice'
WHERE weight ILIKE '%400%';

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';