# Instagram Database — Schema Design

## 1. Overview

The Instagram database is designed using a relational model.
It contains nine tables representing users, posts, stories,
follows, likes, comments, hashtags and post media.

The schema uses primary keys, foreign keys, composite keys,
NOT NULL constraints and CHECK constraints to maintain
data integrity.

## 2. Tables and Attributes

### 2.1 Users

Stores user profile information.

| Attribute | Data Type | Constraint |
|---|---|---|
| user_id | INTEGER | PRIMARY KEY |
| username | VARCHAR(30) | NOT NULL, UNIQUE |
| full_name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| bio | TEXT | NULL |
| account_type | VARCHAR(20) | CHECK |
| is_private | BOOLEAN | NOT NULL |
| is_verified | BOOLEAN | NOT NULL |
| followers_count | INTEGER | NOT NULL |
| following_count | INTEGER | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |

### 2.2 Follows

Stores follower-followee relationships.

| Attribute | Data Type | Constraint |
|---|---|---|
| follower_id | INTEGER | PK, FK |
| followee_id | INTEGER | PK, FK |
| status | VARCHAR(20) | CHECK |
| created_at | TIMESTAMPTZ | NOT NULL |

Composite Primary Key: (follower_id, followee_id).

### 2.3 Hashtags

Stores unique hashtags.

| Attribute | Data Type | Constraint |
|---|---|---|
| hashtag_id | INTEGER | PRIMARY KEY |
| tag | VARCHAR(100) | NOT NULL, UNIQUE |

### 2.4 Posts

Stores user-created posts.

| Attribute | Data Type | Constraint |
|---|---|---|
| post_id | INTEGER | PRIMARY KEY |
| user_id | INTEGER | FOREIGN KEY |
| post_type | VARCHAR(20) | CHECK |
| caption | TEXT | NULL |
| location_name | VARCHAR(255) | NULL |
| like_count | INTEGER | NOT NULL |
| comment_count | INTEGER | NOT NULL |
| is_archived | BOOLEAN | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |

### 2.5 Post_Hashtags

Connects posts with hashtags.

| Attribute | Data Type | Constraint |
|---|---|---|
| post_id | INTEGER | PK, FK |
| hashtag_id | INTEGER | PK, FK |

Composite Primary Key: (post_id, hashtag_id).

### 2.6 Post_Media

Stores media files attached to posts.

| Attribute | Data Type | Constraint |
|---|---|---|
| post_id | INTEGER | PK, FK |
| position | INTEGER | PK |
| media_type | VARCHAR(10) | CHECK |
| media_url | TEXT | NOT NULL |
| width | INTEGER | NOT NULL, CHECK > 0 |
| height | INTEGER | NOT NULL, CHECK > 0 |
| duration_sec | NUMERIC(8,2) | NULL |

Composite Primary Key: (post_id, position).

### 2.7 Likes

Stores user likes on posts.

| Attribute | Data Type | Constraint |
|---|---|---|
| user_id | INTEGER | PK, FK |
| post_id | INTEGER | PK, FK |
| created_at | TIMESTAMPTZ | NOT NULL |

Composite Primary Key: (user_id, post_id).

### 2.8 Comments

Stores comments and replies.

| Attribute | Data Type | Constraint |
|---|---|---|
| comment_id | INTEGER | PRIMARY KEY |
| post_id | INTEGER | FOREIGN KEY |
| user_id | INTEGER | FOREIGN KEY |
| parent_comment_id | INTEGER | Self-referencing FK, NULL |
| body | TEXT | NOT NULL |
| is_hidden | BOOLEAN | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |

### 2.9 Stories

Stores temporary user stories.

| Attribute | Data Type | Constraint |
|---|---|---|
| story_id | INTEGER | PRIMARY KEY |
| user_id | INTEGER | FOREIGN KEY |
| media_type | VARCHAR(10) | CHECK |
| created_at | TIMESTAMPTZ | NOT NULL |
| expires_at | TIMESTAMPTZ | NOT NULL |
| view_count | INTEGER | NOT NULL |

## 3. Relationships and Cardinality

1. Users to Posts: One-to-Many.
2. Users to Stories: One-to-Many.
3. Users to Follows: One-to-Many in both follower and followee roles.
4. Posts to Post_Media: One-to-Many.
5. Posts to Hashtags: Many-to-Many through Post_Hashtags.
6. Users to Posts through Likes: Many-to-Many.
7. Posts to Comments: One-to-Many.
8. Users to Comments: One-to-Many.
9. Comments to Comments: One-to-Many self-referencing relationship.

## 4. Functional Dependencies

The main functional dependencies are:

- users: user_id -> all other attributes.
- follows: (follower_id, followee_id) -> status, created_at.
- hashtags: hashtag_id -> tag.
- posts: post_id -> all other attributes.
- post_hashtags: (post_id, hashtag_id) -> no non-key attributes.
- post_media: (post_id, position) -> all other attributes.
- likes: (user_id, post_id) -> created_at.
- comments: comment_id -> all other attributes.
- stories: story_id -> all other attributes.

## 5. Normalization

### First Normal Form (1NF)

All tables contain atomic values.
Repeating groups such as multiple media files and hashtags
are stored in separate tables.

### Second Normal Form (2NF)

Tables with composite primary keys contain no partial
dependency on only a part of their primary key.
Non-key attributes depend on the complete candidate key.

### Third Normal Form (3NF)

Non-key attributes depend on the key, the whole key,
and nothing but the key.
Separate tables avoid storing repeated user, post and
hashtag information.

## 6. Integrity Constraints

- Primary keys uniquely identify records.
- Foreign keys maintain valid relationships.
- Nullable fields reflect optional seed data.
- Account types, follow statuses and media/post types
  are restricted using CHECK constraints.
- Boolean attributes use PostgreSQL BOOLEAN.
- Timestamp attributes use TIMESTAMPTZ to preserve timezone information.

## 7. Design Notes

The follower and following counts are stored in the users
table as supplied by the seed dataset. They represent
denormalized aggregate values and can be recalculated
from the follows table.

Post like and comment counts are also stored as aggregate
values and can be reconciled with their respective tables.

## post_media Table — Constraints and Data Validation

The post_media table stores images and videos attached to posts.

### Verified data observations

- Total records: 89,854
- IMAGE records: 68,804
- VIDEO records: 21,050
- width ranges from 1080 to 1080.
- height ranges from 1080 to 1920.
- duration_sec ranges from 5.0 to 619.7 for non-NULL records.
- position ranges from 1 to 5.
- No zero or negative numeric values were found.

### Schema constraints

| Column | Constraint | Reason |
|---|---|---|
| post_id | NOT NULL, FOREIGN KEY | Every media item belongs to a post |
| position | NOT NULL, CHECK > 0 | Position must be positive |
| media_type | NOT NULL, CHECK | Only IMAGE and VIDEO are allowed |
| width | NOT NULL, CHECK > 0 | Media width must be positive |
| height | NOT NULL, CHECK > 0 | Media height must be positive |
| duration_sec | NULL allowed | Images do not have duration |

Additional business rule:

- IMAGE records must have NULL duration_sec.
- VIDEO records must have a non-NULL duration_sec.

## Verified Domain Constraints

The categorical values and numeric ranges were inspected directly
from all seed CSV files.

### Categorical constraints

| Table | Column | Allowed values |
|---|---|---|
| users | account_type | BUSINESS, CREATOR, PERSONAL |
| follows | status | ACCEPTED, PENDING |
| posts | post_type | CAROUSEL, PHOTO, REEL, VIDEO |
| post_media | media_type | IMAGE, VIDEO |
| stories | media_type | IMAGE, VIDEO |

### Boolean columns

The following CSV columns contain only true (t) and false (f):

- users.is_private
- users.is_verified
- posts.is_archived
- comments.is_hidden

These columns will use PostgreSQL BOOLEAN.

### Numeric constraints

The following columns contain non-negative values:

- users.followers_count
- users.following_count
- posts.like_count
- posts.comment_count
- stories.view_count

They will use CHECK constraints to prevent negative values.

### Timestamp columns

The dataset timestamps include timezone offsets.
Therefore, timestamp columns will use PostgreSQL TIMESTAMPTZ.

### Data validation observations

- follows.status contains ACCEPTED and PENDING.
- posts.post_type contains CAROUSEL, PHOTO, REEL and VIDEO.
- users.account_type contains BUSINESS, CREATOR and PERSONAL.
- post_media.media_type and stories.media_type contain IMAGE and VIDEO.
- All inspected numeric values were non-negative.

## Uniqueness and Text Data Validation

### Uniqueness checks

The following columns were checked for exact and
case-insensitive duplicates.

| Table | Column | Exact duplicates | Case-insensitive duplicates |
|---|---|---:|---:|
| users | username | 0 | 0 |
| users | email | 0 | 0 |
| hashtags | tag | 0 | 0 |

The database will enforce uniqueness for usernames,
emails and hashtag tags.

Case-insensitive uniqueness will be enforced using
unique indexes on LOWER(username), LOWER(email)
and LOWER(tag).

### Text column observations

The maximum observed lengths in the current dataset are:

| Table | Column | Maximum length |
|---|---|---:|
| users | username | 23 |
| users | email | 33 |
| users | full_name | 18 |
| users | bio | 31 |
| posts | caption | 56 |
| posts | location_name | 11 |
| comments | body | 25 |
| hashtags | tag | 15 |
| post_media | media_url | 43 |

These are observed dataset lengths, not permanent
business limits. Flexible text columns will use TEXT
where appropriate to avoid unnecessarily restricting
future records.

### Data type decisions

- Identifier columns and their foreign keys will use INTEGER.
- Count and position columns will use INTEGER.
- Boolean columns will use BOOLEAN.
- Timestamp columns will use TIMESTAMPTZ.
- Flexible descriptive content will use TEXT.
- Media duration will use NUMERIC(8,2).
