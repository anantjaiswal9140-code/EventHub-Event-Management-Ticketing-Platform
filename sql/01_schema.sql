-- Instagram Social Media Database
-- CP1: Schema & Normalization
-- PostgreSQL 18.3

-- 1. USERS
CREATE TABLE users (
    user_id INTEGER PRIMARY KEY CHECK (user_id > 0),
    username VARCHAR(30) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    bio TEXT,
    account_type VARCHAR(20) NOT NULL
        CHECK (account_type IN ('BUSINESS', 'CREATOR', 'PERSONAL')),
    is_private BOOLEAN NOT NULL,
    is_verified BOOLEAN NOT NULL,
    followers_count INTEGER NOT NULL CHECK (followers_count >= 0),
    following_count INTEGER NOT NULL CHECK (following_count >= 0),
    created_at TIMESTAMPTZ NOT NULL
);

-- Case-insensitive uniqueness
CREATE UNIQUE INDEX users_username_lower_idx
    ON users (LOWER(username));

CREATE UNIQUE INDEX users_email_lower_idx
    ON users (LOWER(email));


-- 2. FOLLOWS
CREATE TABLE follows (
    follower_id INTEGER NOT NULL,
    followee_id INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('ACCEPTED', 'PENDING')),
    created_at TIMESTAMPTZ NOT NULL,

    PRIMARY KEY (follower_id, followee_id),

    FOREIGN KEY (follower_id) REFERENCES users(user_id),
    FOREIGN KEY (followee_id) REFERENCES users(user_id)
);


-- 3. HASHTAGS
CREATE TABLE hashtags (
    hashtag_id INTEGER PRIMARY KEY CHECK (hashtag_id > 0),
    tag VARCHAR(100) NOT NULL UNIQUE
);

CREATE UNIQUE INDEX hashtags_tag_lower_idx
    ON hashtags (LOWER(tag));


-- 4. POSTS
CREATE TABLE posts (
    post_id INTEGER PRIMARY KEY CHECK (post_id > 0),
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    post_type VARCHAR(20) NOT NULL
        CHECK (post_type IN ('CAROUSEL', 'PHOTO', 'REEL', 'VIDEO')),
    caption TEXT,
    location_name VARCHAR(255),
    like_count INTEGER NOT NULL CHECK (like_count >= 0),
    comment_count INTEGER NOT NULL CHECK (comment_count >= 0),
    is_archived BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);


-- 5. POST_HASHTAGS
CREATE TABLE post_hashtags (
    post_id INTEGER NOT NULL REFERENCES posts(post_id),
    hashtag_id INTEGER NOT NULL REFERENCES hashtags(hashtag_id),

    PRIMARY KEY (post_id, hashtag_id)
);


-- 6. POST_MEDIA
CREATE TABLE post_media (
    post_id INTEGER NOT NULL REFERENCES posts(post_id),
    position INTEGER NOT NULL CHECK (position > 0),
    media_type VARCHAR(10) NOT NULL
        CHECK (media_type IN ('IMAGE', 'VIDEO')),
    media_url TEXT NOT NULL,
    width INTEGER NOT NULL CHECK (width > 0),
    height INTEGER NOT NULL CHECK (height > 0),
    duration_sec NUMERIC(8,2),

    PRIMARY KEY (post_id, position),

    CHECK (
        (media_type = 'IMAGE' AND duration_sec IS NULL)
        OR
        (media_type = 'VIDEO' AND duration_sec IS NOT NULL
         AND duration_sec > 0)
    )
);


-- 7. LIKES
CREATE TABLE likes (
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    post_id INTEGER NOT NULL REFERENCES posts(post_id),
    created_at TIMESTAMPTZ NOT NULL,

    PRIMARY KEY (user_id, post_id)
);


-- 8. COMMENTS
CREATE TABLE comments (
    comment_id INTEGER PRIMARY KEY CHECK (comment_id > 0),
    post_id INTEGER NOT NULL REFERENCES posts(post_id),
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    parent_comment_id INTEGER,
    body TEXT NOT NULL,
    is_hidden BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,

    -- Supports same-post parent comment validation
    UNIQUE (comment_id, post_id),

    FOREIGN KEY (parent_comment_id, post_id)
        REFERENCES comments(comment_id, post_id)
);


-- 9. STORIES
CREATE TABLE stories (
    story_id INTEGER PRIMARY KEY CHECK (story_id > 0),
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    media_type VARCHAR(10) NOT NULL
        CHECK (media_type IN ('IMAGE', 'VIDEO')),
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    view_count INTEGER NOT NULL CHECK (view_count >= 0)
);
