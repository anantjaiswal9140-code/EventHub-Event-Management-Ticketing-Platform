# CP2 – Baseline Benchmark Results

## 1. Objective

The objective of CP2 is to measure the performance of the Instagram database workload before applying any database optimizations.

The workload contains 30 SQL queries:
- 24 read queries (R01–R24).
- 6 write queries (W01–W06).

Each query is intended to run three times. Execution plans are collected using `EXPLAIN (ANALYZE, BUFFERS)`.

**Actual benchmark status:** 24 read queries and 5 write queries successfully measured. W01 could not be measured because of a schema constraint incompatibility.

## 2. Benchmark Environment

| Parameter | Value |
|---|---|
| Database | PostgreSQL 18.6 |
| Database name | instagram_t0025 |
| Schema | instagram |
| Platform | macOS, Apple Silicon |
| Benchmark repetitions | 3 |
| Measurement | EXPLAIN (ANALYZE, BUFFERS) |
| Write transaction handling | BEGIN and ROLLBACK |

### Dataset size

| Table | Number of rows |
|---|---:|
| users | 30,000 |
| follows | 258,588 |
| hashtags | 50 |
| posts | 60,000 |
| post_hashtags | 150,000 |
| post_media | 89,854 |
| likes | 419,954 |
| comments | 150,000 |
| stories | 40,000 |
| **Total** | **1,198,446** |

## 3. Benchmark Methodology

1. Used the original `queries/workload_30.sql` without modifying its queries.
2. Executed every read query three times.
3. Executed successful write queries three times inside transactions.
4. Used `EXPLAIN (ANALYZE, BUFFERS)` to collect execution plans and timings.
5. Recorded average, median, minimum and maximum execution times.
6. Preserved raw execution plans in the benchmark results directory.
7. Did not introduce additional tuning indexes or query rewrites.

All execution times are in milliseconds.

## 4. Read Query Results

| Query | Run 1 | Run 2 | Run 3 | Average | Median |
|---|---:|---:|---:|---:|---:|
| R01 | 18.669 | 13.808 | 10.347 | 14.275 | 13.808 |
| R02 | 7.609 | 8.703 | 8.293 | 8.202 | 8.293 |
| R03 | 0.076 | 0.086 | 0.088 | 0.083 | 0.086 |
| R04 | 30.099 | 25.183 | 24.644 | 26.642 | 25.183 |
| R05 | 29.953 | 29.479 | 28.770 | 29.401 | 29.479 |
| R06 | 29.984 | 15.815 | 16.900 | 20.900 | 16.900 |
| R07 | 31.066 | 22.202 | 23.038 | 25.435 | 23.038 |
| R08 | 0.657 | 0.569 | 0.625 | 0.617 | 0.625 |
| R09 | 11.543 | 11.936 | 9.195 | 10.891 | 11.543 |
| R10 | 9.510 | 8.698 | 9.005 | 9.071 | 9.005 |
| R11 | 16.592 | 17.449 | 16.637 | 16.893 | 16.637 |
| R12 | 10.487 | 9.339 | 9.428 | 9.751 | 9.428 |
| R13 | 41.402 | 35.697 | 33.025 | 36.708 | 35.697 |
| R14 | 9.168 | 9.085 | 11.076 | 9.776 | 9.168 |
| R15 | 69.908 | 59.016 | 60.244 | 63.056 | 60.244 |
| R16 | 7.756 | 8.930 | 10.595 | 9.094 | 8.930 |
| R17 | 29.196 | 28.047 | 30.211 | 29.151 | 29.196 |
| R18 | 13.417 | 15.889 | 15.282 | 14.863 | 15.282 |
| R19 | 10844.490 | 11321.321 | 10849.713 | 11005.175 | 10849.713 |
| R20 | 28.718 | 27.637 | 28.269 | 28.208 | 28.269 |
| R21 | 13.293 | 13.860 | 10.427 | 12.527 | 13.293 |
| R22 | 13.597 | 18.815 | 17.971 | 16.794 | 17.971 |
| R23 | 0.062 | 0.062 | 0.041 | 0.055 | 0.062 |
| R24 | 13.990 | 4.051 | 5.194 | 7.745 | 5.194 |

## 5. Read Query Execution Plan Analysis

| Query | Scan types | Main observation |
|---|---|---|
| R01 | Seq Scan posts; Index Scan follows | Full posts scan followed by join and sorting |
| R02 | Seq Scan posts | Scans 60,000 posts to find 11 matching records |
| R03 | Index Scan users_username_key | Efficient unique username lookup |
| R04 | Parallel Seq Scan comments | Multiple scans and parallel hash join |
| R05 | Seq Scan post_hashtags and hashtags; Index Scan posts | Full mapping scan and repeated post lookups |
| R06 | Seq Scan users | Full user scan for ILIKE search |
| R07 | Parallel Seq Scan likes; Index Scan users and follows | Parallel likes scan is the main cost |
| R08 | Index Scan and Index Only Scan follows | Efficient indexed follow lookups |
| R09 | Index Scan follows and users | Indexed relationship lookup and filtering |
| R10 | Seq Scan stories; Index Scan follows | Full story scan with date filter |
| R11 | Seq Scan posts and users | Full scans followed by hash join and aggregation |
| R12 | Seq Scan posts and hashtags; Index Only Scan post_hashtags | Post scan followed by indexed mapping lookups |
| R13 | Index Scan and Seq Scan comments | Full comments scan inside a subplan |
| R14 | Index Scan and Index Only Scan follows | Indexed relationship filtering |
| R15 | Seq Scan follows and users | Large join and aggregation |
| R16 | Seq Scan posts | Full scan for location and date filtering |
| R17 | Seq Scan posts; Index Scan users and post_media | Full post scan and repeated indexed lookups |
| R18 | Seq Scan posts | Full scan followed by sorting and aggregation |
| R19 | Seq Scan users, posts and likes | Repeated correlated subqueries and scans |
| R20 | Seq Scan comments and posts | Full scans followed by join and aggregation |
| R21 | Index Scan follows and posts; Index Only Scan likes | Repeated post lookups in nested-loop processing |
| R22 | Seq Scan comments | Full scan to identify hidden comments |
| R23 | Index Only Scan likes_pkey | Very efficient existence check |
| R24 | Seq Scan stories | Full story scan followed by aggregation |

### Important plan observations

**R19:** The most expensive read query. Its average execution time is 11,005.175 ms. Its execution plan shows repeated correlated subqueries that scan posts and likes. The plan records approximately 1,027,369 shared buffer hits.

**R15:** Takes 63.056 ms on average. It scans follows and users before performing a large join and aggregation.

**R13:** Takes 36.708 ms on average. Although it uses an index for the targeted comment lookup, a subplan performs a sequential scan of comments.

**R23:** The fastest read query at 0.055 ms. It uses an index-only scan with zero heap fetches.

## 6. Write Query Results

| Query | Run 1 | Run 2 | Run 3 | Average | Median |
|---|---:|---:|---:|---:|---:|
| W01 | Not run | Not run | Not run | N/A | N/A |
| W02 | 5.245 | 2.453 | 2.604 | 3.434 | 2.604 |
| W03 | 0.535 | 0.465 | 0.397 | 0.466 | 0.465 |
| W04 | 173.036 | 117.641 | 120.724 | 137.134 | 120.724 |
| W05 | 24.416 | 29.639 | 18.141 | 24.065 | 24.416 |
| W06 | 12.972 | 9.778 | 12.395 | 11.715 | 12.395 |

## 7. Write Query Execution Plan Analysis

| Query | Scan type | Main observation |
|---|---|---|
| W01 | Not executed successfully | NOT NULL constraint violation |
| W02 | No scan node | Direct insert into likes |
| W03 | Index Scan posts_pkey | Updates one post using primary-key lookup |
| W04 | Seq Scan users and follows | Recalculates follower counts using joins and aggregation |
| W05 | Seq Scan stories | Scans stories to identify expired records |
| W06 | Index Scan follows_pkey | Finds 15 pending relationships |

### W01 schema incompatibility

The original W01 query inserts a post without specifying:
- like_count
- comment_count
- is_archived

All three columns are defined as NOT NULL in the baseline schema and have no default values.

Therefore, PostgreSQL rejects W01 with a NOT NULL constraint violation.

The original workload and baseline schema were not silently modified to bypass this issue. W01 is documented as not successfully benchmarked and has no valid execution timing.

This issue should be discussed with the project owner before any schema or workload correction is made.

## 8. Overall Performance Findings

### Slowest queries

| Query | Average time |
|---|---:|
| R19 | 11005.175 ms |
| W04 | 137.134 ms |
| R15 | 63.056 ms |
| R13 | 36.708 ms |
| R05 | 29.401 ms |

### Fastest queries

| Query | Average time |
|---|---:|
| R23 | 0.055 ms |
| R03 | 0.083 ms |
| W03 | 0.466 ms |
| R08 | 0.617 ms |

### Key findings

1. Several queries perform sequential scans over large tables.
2. Exact lookups benefit from existing primary-key and unique indexes.
3. Index-only scans are efficient when they avoid heap fetches.
4. Large joins and aggregations increase execution time.
5. Correlated subqueries are a major performance concern in R19.
6. W04 is expensive because it recalculates follower counts using large scans and aggregation.
7. The baseline results provide a reference for comparing future database optimization work.

## 9. Deliverables

The benchmark outputs are stored in:

- `benchmarks/results/baseline/R01.txt` through `R24.txt`
- `benchmarks/results/baseline/summary_reads.csv`
- `benchmarks/results/baseline/summary.csv`
- `benchmarks/results/baseline_writes/W02.txt` through `W06.txt`
- `benchmarks/results/baseline_writes/summary_writes.csv`

This report is stored at:

`docs/03_baseline_timings.md`

## 10. Conclusion

CP2 baseline benchmarking successfully measured 24 read queries and five write queries, with three executions for each.

A total of 87 successful query executions were recorded.

R19 is the largest performance bottleneck, with an average execution time of approximately 11 seconds. W04 is the slowest successful write query.

The baseline schema and original workload were preserved, and no tuning indexes or query rewrites were introduced.

W01 remains pending resolution of the documented schema incompatibility.

**CP2 status: 29 of 30 queries successfully benchmarked.**