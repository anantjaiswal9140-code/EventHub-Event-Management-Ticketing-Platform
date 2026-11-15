# Instagram Database — Problem Understanding

## 1. Project Overview

Instagram is a social media platform where users follow accounts, publish posts and stories, and interact through likes and comments. The database stores this social activity, including profile information, relationships, media, hashtags and engagement counts.

The existing database has no documented schema. The goal is to rebuild a reliable database structure and later improve query performance without changing query results.

## 2. Business Problems and Stakeholders

| ID | Business Need | Stakeholders | Classification |
|---|---|---|---|
| P1 | Users need their home feed and profile grid to load quickly, especially when following many accounts. | End users, Feed team | Customer-facing / Real-time |
| P2 | Users need post pages to display comments, reply counts, liked-by information and like-button state quickly, even on popular posts. | End users, creators, Post page team | Customer-facing / Real-time |
| P3 | Users need fast search and discovery of hashtags, places and accounts while typing. | End users, Explore team, Search team | Customer-facing / Real-time |
| P4 | Users need quick account suggestions and follow-request screens. | End users, Social graph team | Customer-facing / Real-time |
| P5 | Creators need engagement reports, ghost-follower information, follow-back analysis and Reels performance insights. | Creators, Growth analytics team | Reporting / Analytics |
| P6 | Creators need the comments-without-replies tool to correctly show comments that have not received replies. | Creators | Customer-facing / Real-time |
| P7 | Stored profile follower counts must remain accurate, and the nightly recount process must run efficiently. | Data quality team, end users, creators | Reporting / Analytics |
| P8 | Stories, story insights and moderation tools need to respond quickly, including tools used to review hidden comments. | End users, creators, Trust & Safety team | Customer-facing / Real-time |
| P9 | Analytics reports must complete reliably while supporting an expected 20× increase in data volume. | Growth analytics team | Reporting / Analytics |

## 3. Assumptions

1. The supplied CSV exports represent the existing production data available for rebuilding the database.
2. User IDs, post IDs, comment IDs and story IDs identify their respective records.
3. Only accepted follow relationships count as active followers.
4. Pending follow relationships represent follow requests that have not yet been accepted.
5. Profile counters such as follower, following, like and comment counts are stored values and may need periodic verification.
6. Stories are intended to remain available for 24 hours, as described in the project brief.
7. Customer-facing queries should prioritize response time, while reporting and analytics queries may process larger amounts of data.
8. The database must preserve the results of the supplied workload queries while improving performance.

## 4. Project Objective

The objective is to rebuild a well-constrained PostgreSQL database from the supplied data exports, measure the performance of the 30 provided SQL queries, optimize them without changing their results, and evaluate whether the database can handle the expected future growth.
