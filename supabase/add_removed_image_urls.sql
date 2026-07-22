-- When a candidate removes a photo from their profile, archive its URL here
-- instead of deleting the Storage file. Keeps the file retrievable while
-- image_urls (what's actually shown on the site) no longer references it.
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS removed_image_urls TEXT[] DEFAULT '{}';
