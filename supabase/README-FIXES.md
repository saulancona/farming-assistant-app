# Supabase Security & Performance Fixes

This guide will help you fix the 9 security warnings and 174 performance warnings in your Supabase database.

## What This Script Fixes

### Security Warnings (9 issues):
1. **Overly permissive UPDATE/DELETE policies** on `knowledge_articles` - anyone could modify articles
2. **Missing UPDATE policies** on `post_likes`, `article_likes`, `article_bookmarks` - should not allow updates
3. **Missing DELETE policies** on `conversations` and `messages`
4. **Insecure RLS policies** that allow unauthorized access

### Performance Warnings (174 issues):
1. **Missing indexes** on frequently queried columns
2. **Missing composite indexes** for common query patterns
3. **Missing GIN indexes** for array and text search operations
4. **Inefficient trigger functions** without SECURITY DEFINER
5. **Missing constraints** for data integrity
6. **Unoptimized functions** that trigger RLS overhead

## How to Apply the Fixes

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"

### Step 2: Run the Fix Script
1. Open the file `supabase/fix-security-performance.sql`
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click "Run" (or press Ctrl+Enter)

### Step 3: Run VACUUM ANALYZE (Optional but Recommended)
After the main script completes successfully, run these commands one by one:

```sql
VACUUM ANALYZE community_posts;
VACUUM ANALYZE post_likes;
VACUUM ANALYZE post_comments;
VACUUM ANALYZE conversations;
VACUUM ANALYZE messages;
VACUUM ANALYZE knowledge_articles;
VACUUM ANALYZE article_likes;
VACUUM ANALYZE article_bookmarks;
```

This updates the database statistics so the query planner can make better decisions.

### Step 4: Verify the Fixes
Run these verification queries to check that everything is working:

#### Check RLS Policies:
```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

You should see policies for all CRUD operations (SELECT, INSERT, UPDATE, DELETE) on each table.

#### Check Indexes:
```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

You should see multiple indexes per table, including composite and GIN indexes.

#### Check Constraints:
```sql
SELECT conrelid::regclass AS table_name, conname, contype
FROM pg_constraint
WHERE conrelid::regclass::text IN (
  'community_posts', 'post_likes', 'post_comments', 'conversations',
  'messages', 'knowledge_articles', 'article_likes', 'article_bookmarks'
)
ORDER BY table_name, conname;
```

## What Changed?

### Security Improvements:
- ✅ Restricted UPDATE/DELETE on `knowledge_articles` to authenticated users only
- ✅ Prevented UPDATE operations on like and bookmark tables (should only INSERT/DELETE)
- ✅ Added DELETE policies for `conversations` and `messages`
- ✅ All tables now have complete RLS policy coverage

### Performance Improvements:
- ✅ Added 10+ new composite indexes for common query patterns
- ✅ Added GIN indexes for full-text search on titles and content
- ✅ Added GIN indexes for array operations (tags, crops, participant_ids)
- ✅ Optimized trigger functions with SECURITY DEFINER to bypass RLS overhead
- ✅ Added check constraints to ensure data integrity
- ✅ Created helper functions for common operations

### New Helper Functions:
- `get_or_create_conversation(user1_id, user2_id)` - Get or create a conversation between two users
- `mark_messages_read(conversation_id, user_id)` - Mark all messages as read in a conversation

## Expected Results

After running this script:
- **Security Advisor**: Should show 0-2 warnings (down from 9)
- **Performance Advisor**: Should show 10-30 warnings (down from 174)

Note: You may still see some warnings about:
- Missing indexes on system tables (these are Supabase managed tables)
- Suggested indexes for very rare query patterns (you can ignore these)
- Function optimization suggestions (optional improvements)

## Troubleshooting

### Error: "policy already exists"
If you see this error, some policies may already exist. You can either:
1. Ignore the error (the script uses `IF EXISTS` where possible)
2. Or drop all policies first with:
```sql
-- Drop existing policies (run before the fix script)
DROP POLICY IF EXISTS "Anyone can view community posts" ON community_posts;
-- ... (repeat for each policy)
```

### Error: "index already exists"
This is safe to ignore. The script uses `IF NOT EXISTS` to prevent duplicates.

### Error: "constraint already exists"
You can drop the existing constraint first:
```sql
ALTER TABLE table_name DROP CONSTRAINT constraint_name;
```

## Maintenance

To keep your database optimized:
1. Run `VACUUM ANALYZE` on tables weekly or after large data changes
2. Review the Performance Advisor monthly for new suggestions
3. Monitor slow queries in the Supabase dashboard
4. Add indexes for new query patterns as your app evolves

## Need Help?

If you encounter issues:
1. Check the Supabase logs for detailed error messages
2. Verify your Postgres version is compatible (12+)
3. Ensure you have sufficient database permissions
4. Contact Supabase support if errors persist
