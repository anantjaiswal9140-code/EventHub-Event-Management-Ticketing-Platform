-- Instagram Social Media Database
-- CP1: Load seed data
-- Run from the project root directory.

BEGIN;

-- 1. USERS
\copy users FROM 'seed_data/users.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

-- 2. HASHTAGS
\copy hashtags FROM 'seed_data/hashtags.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

-- 3. POSTS
\copy posts FROM 'seed_data/posts.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

-- 4. FOLLOWS
\copy follows FROM 'seed_data/follows.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

-- 5. POST_MEDIA
\copy post_media FROM 'seed_data/post_media.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

-- 6. POST_HASHTAGS
\copy post_hashtags FROM 'seed_data/post_hashtags.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

-- 7. LIKES
\copy likes FROM 'seed_data/likes.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

-- 8. COMMENTS
\copy comments FROM 'seed_data/comments.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

-- 9. STORIES
\copy stories FROM 'seed_data/stories.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')

COMMIT;
