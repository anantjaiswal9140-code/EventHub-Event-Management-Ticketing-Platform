# Instagram Social Media Database: DBMS Project

**Course:** Database Management Systems · **Year:** B.Tech 2nd year · **Team size:** 4
**Database:** PostgreSQL 15 or newer · **Final submission:** Mon 23 Nov 2026
**Topics used:** Data types & constraints · Keys & relationships · Normalization · Query execution plans · Indexing · Query optimization · VACUUM/ANALYZE · Partitioning & sharding

## Files in this folder

| Path | What it is |
|------|------------|
| `README.md` | This project brief |
| `seed_data.zip` | 9 CSV files (419,954 likes): the only input for Phase 2. Unzip it to get `seed_data/` |
| `queries/workload_30.sql` | The 30 queries for Phase 3 (do not edit) |
| `benchmarks/run_benchmark.sh` | Timing script: 3 runs per query, average, raw plans saved |
| `CHECKPOINTS.md` | Checkpoint dates and the files each one needs (DE and AP repos) |

**Getting started:** **clone this repository and push it into your team's DE repo** (the DE repo you submitted in the form); the steps are in [`CHECKPOINTS.md`](CHECKPOINTS.md). Keep the structure shown in [Repository structure](#repository-structure-submit-exactly-this). Unzip `seed_data.zip` inside your project folder, but don't commit the CSV files. Deadlines are in [`CHECKPOINTS.md`](CHECKPOINTS.md). Then begin with Phase 1.

---

## Team details (fill in before you start)

| Role | Name | Enrollment No. | GitHub Username |
|------|------|----------------|-----------------|
| Group Lead | Dittya Maity | 2501010150 | thedittya471 |
| Member 2 | Kamlesh Patade | 2501010210 | kamleshpatade1 |
| Member 3 | Anant Jaiswal | 2501010053 | anantjaiswal9140-code |
| Member 4 | Shivans Rajesh Gupta | 2501010430 | ShivansGupta25 |

**Team No.:** T0025 · **Section:** B · **Repository URL:** https://github.com/thedittya471/EventHub-Event-Management-Ticketing-Platform_DE_Project_2026

---

## How this project works

| Phase | What you do | You submit | Counts toward | Marks |
|-------|-------------|------------|---------------|------:|
| 1 | Understand the problem statements | `docs/01_problem_understanding.md` | Query Execution | 2 |
| 2 | Work out the database schema **from the seed data** and load it | `sql/01_schema.sql`, `sql/02_load_data.sql`, `docs/02_schema_design.md` | Query Execution | 5 |
| 3 | Run the **30 given SQL queries** and record their execution time | `docs/03_baseline_timings.md`, `benchmarks/results/baseline/` | Query Execution | 3 |
| 4 | Optimize the queries and record the new times | `sql/05_indexes.sql`, `sql/06_optimized_queries.sql`, `docs/04_optimization_report.md`, `benchmarks/results/optimized/` | Code Optimization | 16 |
| 5 | Scalability test on the **large dataset** (given later by faculty) and final report | `docs/05_scalability_report.md`, `benchmarks/results/large/` | Code Optimization | 14 |
| | **Total** | | | **40** |

---

## Phase 1: Problem statements

Instagram is built around a **social graph**: users follow each other (private accounts must approve follow requests), publish **posts** (photos, videos, multi-photo carousels and reels) with captions, hashtags and locations, and post 24-hour **stories**. Other users **like** and **comment** (comments can be replies to other comments). Profiles show follower and like counts that are stored, not counted live. You have joined the Instagram India data platform team.

The current database was put together quickly by an earlier team. It has **no documented schema** (only data exports survive), and the product teams are complaining:

| # | Problem reported | Team | Related queries |
|---|------------------|------|-----------------|
| P1 | "The **home feed** and **profile grid** load slowly for users who follow many accounts." | Feed | R01, R02, R03 |
| P2 | "**Post pages** (comments with reply counts, "liked by", like button state) are slow on viral posts." | Post page | R04, R07, R23, W02, W03 |
| P3 | "**Explore and search** (hashtags, places, accounts) are too slow for type-ahead." | Explore / Search | R05, R06, R12, R16 |
| P4 | "**Suggested accounts** and follow-request screens lag." | Social graph | R08, R09, W06 |
| P5 | "Creators want **insights**: engagement, ghost followers, who doesn't follow back, reels performance." | Creators | R11, R14, R17, R21 |
| P6 | "The creator tool "**comments without replies**" always shows **nothing**." | Creators | R13 |
| P7 | "**Profile counters are sometimes wrong**, and the nightly recount job is too slow." | Data quality | R15, W04 |
| P8 | "Stories (highlights, insights, clean-up) and the moderation console are slow." | Stories / Trust & Safety | R10, R22, R24, W05 |
| P9 | "Content analytics reports time out, and engagement is expected to grow **20×**." | Analytics | R18, R19, R20, W01 |

**Your job:**
1. Rebuild a correct, well-constrained schema from the data exports (Phase 2).
2. Measure how the 30 most important queries perform today (Phase 3).
3. Make them fast **without changing their results** (Phase 4).
4. Prove the database will survive next year's growth (Phase 5).

**Deliverable for Phase 1** (`docs/01_problem_understanding.md`, at most 1 page):
- For each problem P1–P9, write in your own words what the business needs and which **stakeholder** is affected (end user, creator, business account, feed/explore team, search, trust & safety, data quality, growth analytics).
- Classify each problem as **customer-facing / real-time** or **reporting / analytics**. This decides your performance targets later.
- List any assumptions you make.

---

## Phase 2: Work out the schema from the seed data

You receive **`seed_data.zip`**. Unzip it to get a folder **`seed_data/`** with 9 CSV files, a real export of the production data:

| File | Rows | What it contains |
|------|-----:|------------------|
| `users.csv` | 30,000 | Instagram accounts |
| `follows.csv` | 258,588 | Who follows whom (and pending requests to private accounts) |
| `hashtags.csv` | 50 | Hashtags |
| `posts.csv` | 60,000 | Posts published from 1 Jan 2025 to 30 Jun 2026 |
| `post_hashtags.csv` | 150,000 | Hashtags used in each post |
| `post_media.csv` | 89,854 | Images/videos inside each post (carousels have several) |
| `likes.csv` | 419,954 | Likes on posts |
| `comments.csv` | 150,000 | Comments and replies to comments |
| `stories.csv` | 40,000 | 24-hour stories |

The first line of every file is the header (column names). Here are the headers and the first rows of each file:

**users.csv**
```
user_id,username,full_name,email,bio,account_type,is_private,is_verified,followers_count,following_count,created_at
1,vivaan_sharma1,Vivaan Sharma,vivaan.sharma1@gmail.com,Fitness coach 💪,CREATOR,f,t,7327,5,2017-01-19 12:26:16+05:30
2,adityasharma2,Aditya Sharma,aditya.sharma2@gmail.com,Bengaluru 📍,CREATOR,f,t,2055,8,2017-03-10 22:32:15+05:30
```

**follows.csv**
```
follower_id,followee_id,status,created_at
1,5,ACCEPTED,2021-11-11 11:50:52+05:30
1,54,ACCEPTED,2026-01-29 22:04:48+05:30
```

**hashtags.csv**
```
hashtag_id,tag
1,travel
2,food
```

**posts.csv**
```
post_id,user_id,post_type,caption,location_name,like_count,comment_count,is_archived,created_at
1,6,CAROUSEL,Can't wait for the next trip #photography,,0,1,f,2025-01-01 00:00:00+05:30
2,26954,PHOTO,Chai and conversations #bengaluru,,7,4,f,2025-01-01 00:13:06+05:30
```

**post_hashtags.csv**
```
post_id,hashtag_id
1,8
1,19
```

**post_media.csv**
```
post_id,position,media_type,media_url,width,height,duration_sec
1,1,IMAGE,https://cdn.instagram.example/m/1_1.jpg,1080,1080,
1,2,IMAGE,https://cdn.instagram.example/m/1_2.jpg,1080,1350,
```

**likes.csv**
```
user_id,post_id,created_at
1,6913,2025-03-13 23:34:50+05:30
1,22404,2025-07-23 21:29:54+05:30
```

**comments.csv**
```
comment_id,post_id,user_id,parent_comment_id,body,is_hidden,created_at
1,32861,22381,,🔥🔥🔥,f,2025-10-27 10:07:26+05:30
2,4312,4259,,Haha so true 😂,f,2025-02-09 06:17:20+05:30
```

**stories.csv**
```
story_id,user_id,media_type,created_at,expires_at,view_count
1,352,VIDEO,2025-01-01 00:00:00+05:30,2025-01-02 00:00:00+05:30,4444
2,11971,VIDEO,2025-01-01 00:19:39+05:30,2025-01-02 00:19:39+05:30,873
```

Open the files yourself (a spreadsheet, `head`, or `SELECT` after a quick load into a scratch table) and study the data carefully. **Nobody will give you the CREATE TABLE statements.** Working them out *is* the task.

### 2.1 What you must identify (for every table)
1. **Table name and column names.** Use exactly the file names and CSV headers. The 30 queries depend on them.
2. **Data type** of every column. Choose the *right* type, not just `TEXT` everywhere. Think about money, timestamps with a time-zone offset, yes/no columns, small whole numbers, decimals and short codes.
3. **Primary key.** Is it one column, or a combination? (Look closely at `follows`, `likes`, `post_hashtags` and `post_media`: what makes a row unique?)
4. **Foreign keys.** Which column points to which table? What should happen **ON DELETE** (CASCADE, RESTRICT or SET NULL), and why?
5. **NOT NULL vs NULL.** Some columns are empty in some rows. Find out **when** and **why**, and decide which columns must never be empty. When are `caption`, `location_name`, `bio`, `duration_sec` and `parent_comment_id` empty, and what does an empty `parent_comment_id` mean?
6. **UNIQUE** columns (natural candidate keys such as emails, phone numbers, codes and handles).
7. **CHECK constraints.** Write at least **12** that the data obeys and the business needs. Look for formats (username, hashtag), allowed values (account/post/media types, follow status), ranges (dimensions, durations, carousel positions), and rules tying columns together (a user can't follow themselves, video ⇔ duration, a story expires exactly 24 hours after it was posted, a business account can't be private).
8. **Relationships and cardinalities** (1:1, 1:N, M:N). Draw the **ER diagram** (image + Mermaid code).
9. **Normal form.** Show that each table is in 3NF/BCNF (list its functional dependencies). Point out any column that is *derived or redundant* (hint: `followers_count`, `following_count`, `like_count`, `comment_count` and `stories.expires_at`) and say whether keeping it is justified.

### 2.2 Rules for your schema
- Create every table in a schema named **`instagram`**: `CREATE SCHEMA instagram;` and `SET search_path TO instagram;`
- In this phase create **only constraints**: PK, FK, UNIQUE, NOT NULL, CHECK. **Do not create any other index yet.** (PostgreSQL automatically indexes PRIMARY KEY and UNIQUE columns; that's allowed. Note which indexes exist.) Your baseline in Phase 3 must reflect a database *without* tuning.
- Your constraints must accept **all** rows of the seed data. If a load fails, either your constraint is wrong or you found a data problem. Explain which in your design doc.

### 2.3 Load the data
Write `sql/02_load_data.sql` using `\copy`, loading tables in the right order (parents before children):

```sql
SET search_path TO instagram;
\copy users FROM 'seed_data/users.csv' WITH (FORMAT csv, HEADER true)
-- ... the other tables, in an order that satisfies your foreign keys
ANALYZE;
```

Then verify the row counts match the table above, and run at least **3 integrity checks** of your own (e.g. "a reply belongs to the same post as the comment it replies to", "every carousel has at least two media items", "stored like counts match the likes table"). Paste the results into `docs/02_schema_design.md`.

### Phase 2 deliverables
- `sql/01_schema.sql`: runs top-to-bottom on an empty database without errors
- `sql/02_load_data.sql`: loads all 9 files without errors
- `docs/02_schema_design.md`: data dictionary (table · column · type · constraint · *why*), ER diagram, FDs and normal form per table, integrity-check results, and every data problem you found

---

## Phase 3: Run the 30 queries and record the time

The file **`queries/workload_30.sql`** contains **30 queries**: 24 reads (`R01`–`R24`) and 6 writes (`W01`–`W06`). They're also listed in the [Appendix](#appendix-the-30-queries). **Do not modify them.** If a query fails, your schema doesn't match the seed data; fix the schema, not the query.

### 3.1 How to measure (everyone must use the same method)
- Run each query with `EXPLAIN (ANALYZE, BUFFERS)` and read the **`Execution Time`** at the bottom.
- Run each query **3 times** and record the **average** of the three `Execution Time` values. Keep all three runs in the raw plan file.
- Write queries (`W01`–`W06`) must be measured inside `BEGIN; … ROLLBACK;` so the data does not change.
- Close other heavy applications while measuring, and use the **same laptop** for Phase 3 and Phase 4.

The helper script does all of this for you:
```bash
./benchmarks/run_benchmark.sh <your_database> baseline
# → benchmarks/results/baseline/summary.csv   (avg, median, min, max, scan types)
# → benchmarks/results/baseline/R01.txt …     (full plans of all 3 runs)
```
> ⚠️ One of the 30 queries takes **noticeably longer** than the others on the seed data. That's intentional. Let it finish, and don't skip it.

### 3.2 Deliverable: the timing table
In `docs/03_baseline_timings.md`, fill this table for **all 30** queries:

| SQL Query | Type | Run 1 (ms) | Run 2 (ms) | Run 3 (ms) | Average (ms) |
|---|---|---:|---:|---:|---:|
| R01: Home feed: the latest 30 posts from accounts user 1042 follows | READ | | | | |
| R02: Profile grid: user 217's latest 12 posts | READ | | | | |
| R03: Open a profile by username | READ | | | | |
| R04: Post page: top-level comments on post 59689 with the number of replies each has | READ | | | | |
| R05: Explore: top posts tagged #travel in June 2026 | READ | | | | |
| R06: Search bar: accounts whose username starts with "karan" or whose name contains "karan sharma" | READ | | | | |
| R07: "Liked by": people who liked post 59689, showing whether user 1042 follows them | READ | | | | |
| R08: "Suggested for you": friends-of-friends of user 1042 that 1042 doesn't follow yet | READ | | | | |
| R09: Follow requests screen: pending requests for private account 338 | READ | | | | |
| R10: Story highlights: stories posted in June 2026 by accounts user 1042 follows | READ | | | | |
| R11: Creator insights: engagement rate (likes + comments per follower) of creators' 2026 posts, top 20 | READ | | | | |
| R12: Trending: hashtags used most in the last 7 days of June 2026 | READ | | | | |
| R13: Creator tools: comments on post 59689 that nobody has replied to yet | READ | | | | |
| R14: "Not following back": accounts that follow user 217 whom 217 doesn't follow | READ | | | | |
| R15: Data quality: verified or creator accounts whose stored follower count is wrong | READ | | | | |
| R16: Places: posts tagged with a location containing "goa" in June 2026 | READ | | | | |
| R17: Reels team: creators' reels longer than 60 seconds posted in 2026 | READ | | | | |
| R18: Content analytics: new posts per day and type in June 2026 | READ | | | | |
| R19: Verified-account report: last post time and total likes received by every verified account | READ | | | | |
| R20: Content analytics: 10 most-commented posts of June 2026 (counting real comments) | READ | | | | |
| R21: Creator tools: "ghost followers" of user 217 (followers who never liked any of 217's posts) | READ | | | | |
| R22: Moderation console: hidden comments, newest first, page 61 (25 per page) | READ | | | | |
| R23: Like button state: has user 1042 liked post 59689? | READ | | | | |
| R24: Story insights: total story views per account in the last 30 days, top 20 | READ | | | | |
| W01: Publish a new photo post | WRITE | | | | |
| W02: Double-tap: user 1042 likes post 59689 | WRITE | | | | |
| W03: Keep the counter in sync after the like | WRITE | | | | |
| W04: Nightly job: recompute every user's follower count | WRITE | | | | |
| W05: Housekeeping: delete stories that expired before June 2026 | WRITE | | | | |
| W06: Private account 338 accepts all pending follow requests | WRITE | | | | |
| **Total (sum of all 30)** | | | | | |

Below the table, add for each query the **scan type** from the plan (Seq Scan, Index Scan, …) and one line on **why** it is slow or fast.

---

## Phase 4: Optimize the queries

Make the queries faster. **The results must stay the same** (same rows; order matters only where the query has an `ORDER BY`).

### 4.1 Techniques you may use
| Technique | Example |
|-----------|---------|
| B-tree index (single / composite) | the right column **order** matters: equality columns first, then range/sort |
| Partial index | index only the rows a query needs (e.g. a rare status) |
| Covering index | `INCLUDE (...)` so the table is never visited (Index Only Scan) |
| Expression index | index the exact expression used in `WHERE` |
| GIN index | for `ILIKE '%text%'` (extension `pg_trgm`), arrays or full-text search |
| BRIN index | for huge tables stored in time order |
| Query rewrite | sargable date ranges instead of functions on columns; `NOT EXISTS` instead of `NOT IN`; joins instead of correlated subqueries; keyset instead of `OFFSET` pagination; `UNION ALL` instead of `OR` across columns |
| VACUUM / ANALYZE | fresh statistics and visibility maps |
| Summary table / materialized view | for heavy reports that don't need live data (state how it's refreshed) |

**Not allowed:** changing the data, deleting rows, changing PostgreSQL server settings to hide the problem (e.g. huge `work_mem`, `enable_seqscan = off`), or caching results outside the database.

### 4.2 How to work
1. Put every index in `sql/05_indexes.sql`, each with a comment: **which queries it serves and why this type and column order**.
2. Put rewritten queries in `sql/06_optimized_queries.sql`. Copy `queries/workload_30.sql` and change **only** the queries you rewrite, keeping the `-- @R01` markers.
3. **Prove the results are unchanged** for every rewritten query (compare row counts, plus a checksum or an `EXCEPT` query). Put the proof in your report.
4. Benchmark again with the same method:
```bash
./benchmarks/run_benchmark.sh <your_database> optimized 5 sql/06_optimized_queries.sql
```
> 🔎 **Read the results, not just the timings.** At least one of the 30 original queries returns a **wrong answer** because of a subtle SQL rule about NULLs. Find it, explain it, and fix it. This is worth marks.

### 4.3 Deliverable: the optimization table
In `docs/04_optimization_report.md`:

| Query | Before (ms) | Problem found in the plan | Optimization applied | After (ms) | Improvement | Same result? |
|-------|------------:|---------------------------|----------------------|-----------:|------------:|:------------:|
| R01 | | e.g. Seq Scan on 60k posts + sort | e.g. index on `posts(user_id, created_at DESC)` | | e.g. 97% (35×) | ✅ |
| … all 30 … | | | | | | |
| **Total** | | | | | | |

Improvement % = (before − after) / before × 100

Also include:
- **Before/after `EXPLAIN` plans** for your 5 biggest improvements
- **Write overhead:** which write queries got **slower** because of your indexes, by how much, and whether that's acceptable
- **Index storage:** the size of each index you created (`pg_relation_size`) compared with its table
- **Queries you could not speed up**, and why (an honest "this query must read most of the table" earns marks)

---

## Phase 5: Scalability report (large dataset round)

Your optimizations worked on 419,954 likes. Next year the business expects **20× the volume**.

By **Thu 19 Nov 2026**, faculty will release **`large_data.zip`**: the same 9 CSV files with about **20× the rows** (≈ 8,399,000 likes, ≈ 1,200,000 posts, ≈ 3,000,000 comments, ≈ 5,172,000 follows, ≈ 600,000 users). Until then, work on the design part of the report.

### 5.1 What to do with the large dataset
1. Create a new database. Run **your** `01_schema.sql`, load `large_data/` with your load script (change the folder name only), then run **your** `05_indexes.sql` and `ANALYZE`.
2. Run your **optimized** queries (`sql/06_optimized_queries.sql`). **Do not run the original 30 on the large data.** Some of them could run for a very long time.
   - R22 pages with `OFFSET`; if you replaced it with keyset pagination, explain how the "last seen" value is chosen for the large data.
3. Record the times and compare with your Phase 4 results on the seed data.

| Query | Optimized on seed (ms) | Optimized on large (ms) | Growth (large ÷ seed) | Meets target? | If not, what you changed |
|-------|------------------------:|------------------------:|----------------------:|:-------------:|--------------------------|
| R01 | | | | | |
| … all 30 … | | | | | |

### 5.2 Performance targets on the large dataset
| Query group | Queries | Target (average of 3 runs) |
|-------------|---------|----------------:|
| Real-time / user-facing | R01, R02, R03, R04, R07, R09, R23, W01, W02, W03, W06 | **under 5 ms** |
| Interactive search and tools | R05, R06, R08, R10, R13, R14, R16, R21, R22 | **under 250 ms** |
| Reports and analytics | R11, R12, R15, R17, R18, R19, R20, R24 | **under 5,000 ms** |
| Batch jobs | W04, W05 | **under 3,000 ms** |

If a query misses its target, **find out why from the plan and fix it.** A query that was fast on the seed data can become slow on large data for reasons that only appear at scale. Show the before/after plans for every fix.

### 5.3 Deliverable: `docs/05_scalability_report.md`
1. **Results table** (above), with every target met or explained.
2. **Growth analysis.** Group your queries by how their time grew when the data grew 20×:
   - *stayed about the same* (why? e.g. index lookups grow with log n)
   - *grew about 20×* (why? e.g. they read a fixed *share* of the table)
   - *grew more than 20×* (why, and what you did about it)
3. **What broke at scale** and how you fixed it (plans before/after).
4. **Storage:** total database size, table vs index size, on seed and large data.
5. **Architecture for 100×:** explain with numbers from your own measurements:
   - **Partitioning:** which table, by which column (RANGE / LIST / HASH), and why. Write the DDL for `likes`, show partition pruning with `EXPLAIN`, and note the primary-key rule for partitioned tables.
   - **Sharding:** Would you shard by user (author) or by post? Think about the home feed (R01) that reads posts of many authors, and the post page (R04, R07). Which queries become cross-shard, and how would you handle them?
   - **Read replicas and caching:** which of the 30 queries you would send to a replica or cache, and which must hit the primary.
   - **Maintenance:** VACUUM/autovacuum settings for `likes`, archiving old data, refreshing summary tables.
6. **Conclusion:** is your database ready for next year? What are the remaining risks?

---

## Repository structure (submit exactly this)

```
instagram-dbms-<team-no>/
├── README.md                          # team table, how to run, headline numbers
├── team.json                          # group lead, members, enrollment numbers
├── docs/
│   ├── 01_problem_understanding.md
│   ├── 02_schema_design.md
│   ├── 03_baseline_timings.md
│   ├── 04_optimization_report.md
│   └── 05_scalability_report.md
├── diagrams/
│   └── er_diagram.png
├── sql/
│   ├── 01_schema.sql
│   ├── 02_load_data.sql
│   ├── 05_indexes.sql
│   ├── 06_optimized_queries.sql
│   └── 08_partitioning.sql
├── queries/
│   └── workload_30.sql                # given; do not edit
└── benchmarks/
    ├── run_benchmark.sh               # given
    └── results/
        ├── baseline/                  # Phase 3: summary.csv + raw plans
        ├── optimized/                 # Phase 4
        └── large/                     # Phase 5
```

`team.json`:
```json
{
  "team_number": "",
  "group_lead": { "name": "", "enrollment_no": "", "github": "" },
  "members": [
    { "name": "", "enrollment_no": "", "github": "" },
    { "name": "", "enrollment_no": "", "github": "" },
    { "name": "", "enrollment_no": "", "github": "" }
  ],
  "postgres_version": "",
  "laptop_used_for_benchmarks": ""
}
```

**Do not commit the CSV files** (`seed_data/`, `large_data/`); add them to `.gitignore`. They are too large and we already have them.

---

## Timeline

| Due | Work | Checkpoint |
|-----|------|------------|
| Tue 3 Nov 2026 | Clone this repo into your team's DE repo, add members, commit `team.json` | **CP0** Setup |
| Mon 16 Nov 2026 | Phase 1 + Phase 2 (schema, load, ER, data dictionary) | **CP1** Schema loads all seed data with no errors |
| Tue 17 Nov 2026 | Phase 3 (baseline, 3 runs, average) + start Phase 4 | **CP2** Baseline table for all 30 queries committed |
| Thu 19 Nov 2026 | Phase 4 (indexes, rewrites, wrong-result query) | **CP3** Optimization table committed |
| Mon 23 Nov 2026 | Phase 5 on the large dataset + final report | **CP4 Final submission:** last commit on the default branch |
| Wed 25 – Thu 26 Nov 2026 | Individual analysis, in class time | **CP5** Individual analysis |

Full list of files per checkpoint, including the AP repo: [`CHECKPOINTS.md`](CHECKPOINTS.md).

---

## Evaluation (40 marks)

These 40 marks are the DE part of the project: **Query Execution (10)** and **Code Optimization (30)**.
The AP project (20) and your Individual analysis (40) make up the rest of the 100.

| Phase | Criteria | Marks |
|-------|----------|------:|
| | **Query Execution** | **10** |
| 1 | Problems understood, stakeholders and query groups correctly identified | 2 |
| 2 | Correct data types (1), keys and foreign keys with justified delete rules (1), ≥12 meaningful CHECK / NOT NULL / UNIQUE constraints (1), ER diagram + normal-form analysis (1), data loads cleanly + integrity checks (1) | 5 |
| 3 | All 30 queries measured with the required method: 3 runs, average (1), raw plans committed (1), scan type and reason for each query (1) | 3 |
| | **Code Optimization** | **30** |
| 4 | Speed-up achieved with appropriate techniques (6), every index justified (3), results proven unchanged (2), wrong-result query found and explained (2), write overhead and index storage reported (3) | 16 |
| 5 | Large-dataset results with all targets met or explained (4), growth analysis (3), scale-only problems found and fixed (3), partitioning DDL + sharding/replica design backed by your numbers (4) | 14 |
| | **Total** | **40** |

**Integrity rules**
- Every number in your reports must match the raw plan files in `benchmarks/results/`. Copied or invented timings make the whole phase score 0.
- Every member must have commits; the commit history is checked.
- You may use AI tools to learn, but you must be able to explain every index and rewrite in your individual analysis.

---

## Appendix: the 30 queries

These are identical to `queries/workload_30.sql`. Use the file, not copy-paste from this page.

**R01: Home feed: the latest 30 posts from accounts user 1042 follows**
```sql
SELECT p.post_id, p.user_id, p.post_type, p.caption, p.like_count, p.created_at
FROM follows f
JOIN posts p ON p.user_id = f.followee_id
WHERE f.follower_id = 1042
  AND f.status = 'ACCEPTED'
  AND NOT p.is_archived
ORDER BY p.created_at DESC
LIMIT 30;
```

**R02: Profile grid: user 217's latest 12 posts**
```sql
SELECT post_id, post_type, like_count, comment_count, created_at
FROM posts
WHERE user_id = 217 AND NOT is_archived
ORDER BY created_at DESC
LIMIT 12;
```

**R03: Open a profile by username**
```sql
SELECT user_id, full_name, bio, is_private, is_verified, followers_count, following_count
FROM users
WHERE username = 'karan_singh217';
```

**R04: Post page: top-level comments on post 59689 with the number of replies each has**
```sql
SELECT c.comment_id, c.user_id, c.body, c.created_at, count(r.comment_id) AS replies
FROM comments c
LEFT JOIN comments r ON r.parent_comment_id = c.comment_id
WHERE c.post_id = 59689
  AND c.parent_comment_id IS NULL
  AND NOT c.is_hidden
GROUP BY c.comment_id, c.user_id, c.body, c.created_at
ORDER BY c.created_at;
```

**R05: Explore: top posts tagged #travel in June 2026**
```sql
SELECT p.post_id, p.user_id, p.like_count
FROM hashtags h
JOIN post_hashtags ph ON ph.hashtag_id = h.hashtag_id
JOIN posts p          ON p.post_id = ph.post_id
WHERE h.tag = 'travel'
  AND p.created_at >= '2026-06-01'
ORDER BY p.like_count DESC
LIMIT 30;
```

**R06: Search bar: accounts whose username starts with "karan" or whose name contains "karan sharma"**
```sql
SELECT user_id, username, full_name, is_verified, followers_count
FROM users
WHERE username ILIKE 'karan%' OR full_name ILIKE '%karan sharma%'
ORDER BY is_verified DESC, followers_count DESC
LIMIT 20;
```

**R07: "Liked by": people who liked post 59689, showing whether user 1042 follows them**
```sql
SELECT l.user_id, u.username, (f.follower_id IS NOT NULL) AS you_follow, l.created_at
FROM likes l
JOIN users u ON u.user_id = l.user_id
LEFT JOIN follows f ON f.follower_id = 1042 AND f.followee_id = l.user_id AND f.status = 'ACCEPTED'
WHERE l.post_id = 59689
ORDER BY you_follow DESC, l.created_at DESC;
```

**R08: "Suggested for you": friends-of-friends of user 1042 that 1042 doesn't follow yet**
```sql
SELECT f2.followee_id AS suggested_user, count(*) AS mutual_connections
FROM follows f1
JOIN follows f2 ON f2.follower_id = f1.followee_id AND f2.status = 'ACCEPTED'
WHERE f1.follower_id = 1042
  AND f1.status = 'ACCEPTED'
  AND f2.followee_id <> 1042
  AND NOT EXISTS (SELECT 1 FROM follows x WHERE x.follower_id = 1042 AND x.followee_id = f2.followee_id)
GROUP BY f2.followee_id
ORDER BY mutual_connections DESC, suggested_user
LIMIT 20;
```

**R09: Follow requests screen: pending requests for private account 338**
```sql
SELECT f.follower_id, u.username, f.created_at
FROM follows f
JOIN users u ON u.user_id = f.follower_id
WHERE f.followee_id = 338 AND f.status = 'PENDING'
ORDER BY f.created_at DESC;
```

**R10: Story highlights: stories posted in June 2026 by accounts user 1042 follows**
```sql
SELECT s.story_id, s.user_id, s.media_type, s.created_at, s.view_count
FROM stories s
JOIN follows f ON f.followee_id = s.user_id AND f.follower_id = 1042 AND f.status = 'ACCEPTED'
WHERE DATE(s.created_at) BETWEEN '2026-06-01' AND '2026-06-30'
ORDER BY s.created_at DESC;
```

**R11: Creator insights: engagement rate (likes + comments per follower) of creators' 2026 posts, top 20**
```sql
SELECT u.user_id, u.username, u.followers_count,
       round(sum(p.like_count + p.comment_count)::numeric / NULLIF(u.followers_count, 0), 3) AS engagement_per_follower
FROM users u
JOIN posts p ON p.user_id = u.user_id
WHERE u.account_type = 'CREATOR'
  AND p.created_at >= '2026-01-01'
GROUP BY u.user_id, u.username, u.followers_count
HAVING u.followers_count >= 20
ORDER BY engagement_per_follower DESC
LIMIT 20;
```

**R12: Trending: hashtags used most in the last 7 days of June 2026**
```sql
SELECT h.tag, count(*) AS posts
FROM post_hashtags ph
JOIN hashtags h ON h.hashtag_id = ph.hashtag_id
JOIN posts p    ON p.post_id = ph.post_id
WHERE p.created_at >= '2026-06-24'
GROUP BY h.tag
ORDER BY posts DESC
LIMIT 10;
```

**R13: Creator tools: comments on post 59689 that nobody has replied to yet**
```sql
SELECT c.comment_id, c.user_id, c.body
FROM comments c
WHERE c.post_id = 59689
  AND c.comment_id NOT IN (SELECT r.parent_comment_id FROM comments r);
```

**R14: "Not following back": accounts that follow user 217 whom 217 doesn't follow**
```sql
SELECT f.follower_id
FROM follows f
WHERE f.followee_id = 217 AND f.status = 'ACCEPTED'
  AND NOT EXISTS (SELECT 1 FROM follows b WHERE b.follower_id = 217 AND b.followee_id = f.follower_id)
ORDER BY f.follower_id;
```

**R15: Data quality: verified or creator accounts whose stored follower count is wrong**
```sql
SELECT u.user_id, u.username, u.followers_count AS stored, count(f.follower_id) AS actual
FROM users u
LEFT JOIN follows f ON f.followee_id = u.user_id AND f.status = 'ACCEPTED'
WHERE u.is_verified OR u.account_type = 'CREATOR'
GROUP BY u.user_id, u.username, u.followers_count
HAVING u.followers_count <> count(f.follower_id)
ORDER BY u.user_id;
```

**R16: Places: posts tagged with a location containing "goa" in June 2026**
```sql
SELECT post_id, user_id, location_name, like_count
FROM posts
WHERE location_name ILIKE '%goa%'
  AND created_at >= '2026-06-01' AND created_at < '2026-07-01'
ORDER BY like_count DESC;
```

**R17: Reels team: creators' reels longer than 60 seconds posted in 2026**
```sql
SELECT p.post_id, p.user_id, pm.duration_sec, p.like_count
FROM posts p
JOIN post_media pm ON pm.post_id = p.post_id AND pm.position = 1
JOIN users u       ON u.user_id = p.user_id
WHERE p.post_type = 'REEL'
  AND pm.duration_sec > 60
  AND u.account_type = 'CREATOR'
  AND EXTRACT(YEAR FROM p.created_at) = 2026
ORDER BY p.like_count DESC
LIMIT 50;
```

**R18: Content analytics: new posts per day and type in June 2026**
```sql
SELECT created_at::date AS day, post_type, count(*) AS posts
FROM posts
WHERE created_at::date BETWEEN '2026-06-01' AND '2026-06-30'
GROUP BY 1, 2
ORDER BY 1, 2;
```

**R19: Verified-account report: last post time and total likes received by every verified account**
```sql
SELECT u.user_id, u.username,
       (SELECT max(p.created_at) FROM posts p WHERE p.user_id = u.user_id) AS last_post_at,
       (SELECT count(*) FROM likes l JOIN posts p ON p.post_id = l.post_id WHERE p.user_id = u.user_id) AS likes_received
FROM users u
WHERE u.is_verified
ORDER BY likes_received DESC;
```

**R20: Content analytics: 10 most-commented posts of June 2026 (counting real comments)**
```sql
SELECT c.post_id, count(*) AS comments
FROM comments c
JOIN posts p ON p.post_id = c.post_id
WHERE p.created_at >= '2026-06-01'
GROUP BY c.post_id
ORDER BY comments DESC
LIMIT 10;
```

**R21: Creator tools: "ghost followers" of user 217 (followers who never liked any of 217's posts)**
```sql
SELECT f.follower_id
FROM follows f
WHERE f.followee_id = 217 AND f.status = 'ACCEPTED'
  AND NOT EXISTS (SELECT 1 FROM likes l JOIN posts p ON p.post_id = l.post_id
                  WHERE l.user_id = f.follower_id AND p.user_id = 217)
ORDER BY f.follower_id;
```

**R22: Moderation console: hidden comments, newest first, page 61 (25 per page)**
```sql
SELECT comment_id, post_id, user_id, body, created_at
FROM comments
WHERE is_hidden
ORDER BY created_at DESC
OFFSET 1500
LIMIT 25;
```

**R23: Like button state: has user 1042 liked post 59689?**
```sql
SELECT EXISTS (SELECT 1 FROM likes WHERE user_id = 1042 AND post_id = 59689) AS liked;
```

**R24: Story insights: total story views per account in the last 30 days, top 20**
```sql
SELECT user_id, count(*) AS stories, sum(view_count) AS views
FROM stories
WHERE created_at >= '2026-06-01'
GROUP BY user_id
ORDER BY views DESC
LIMIT 20;
```

**W01: Publish a new photo post**
```sql
INSERT INTO posts (post_id, user_id, post_type, caption, location_name, created_at)
VALUES (90000001, 1042, 'PHOTO', 'Monsoon diaries #monsoon', 'Mumbai', '2026-07-01 08:00:00+05:30');
```

**W02: Double-tap: user 1042 likes post 59689**
```sql
INSERT INTO likes (user_id, post_id, created_at)
VALUES (1042, 59689, '2026-07-01 08:01:00+05:30')
ON CONFLICT (user_id, post_id) DO NOTHING;
```

**W03: Keep the counter in sync after the like**
```sql
UPDATE posts SET like_count = like_count + 1 WHERE post_id = 59689;
```

**W04: Nightly job: recompute every user's follower count**
```sql
UPDATE users u
SET followers_count = coalesce(s.n, 0)
FROM (SELECT uu.user_id, count(f.follower_id) AS n
      FROM users uu LEFT JOIN follows f ON f.followee_id = uu.user_id AND f.status = 'ACCEPTED'
      GROUP BY uu.user_id) s
WHERE s.user_id = u.user_id AND u.followers_count <> coalesce(s.n, 0);
```

**W05: Housekeeping: delete stories that expired before June 2026**
```sql
DELETE FROM stories
WHERE expires_at < '2026-06-01';
```

**W06: Private account 338 accepts all pending follow requests**
```sql
UPDATE follows
SET status = 'ACCEPTED'
WHERE followee_id = 338 AND status = 'PENDING';
```
