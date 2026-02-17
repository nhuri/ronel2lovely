-- Migrate image_url (TEXT) to image_urls (TEXT[])
-- Preserves existing single URL as the first element of the array

ALTER TABLE candidates ADD COLUMN image_urls TEXT[];

UPDATE candidates
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL;

ALTER TABLE candidates DROP COLUMN image_url;
