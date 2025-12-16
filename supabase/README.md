# Supabase Database Setup

This directory contains SQL schema files for setting up your AgroAfrica database in Supabase.

## How to Run the Schema

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `cdwzoujzkhefbftuqbxg`

2. **Open the SQL Editor**
   - In the left sidebar, click on "SQL Editor"
   - Click on "+ New query"

3. **Run the Community & Messages Schema**
   - Open the file: `schema-community-messages.sql`
   - Copy all the SQL code
   - Paste it into the SQL Editor
   - Click "Run" button

4. **Run the Knowledge Articles Schema**
   - Open the file: `schema-knowledge-articles.sql`
   - Copy all the SQL code
   - Paste it into the SQL Editor (in a NEW query tab)
   - Click "Run" button

5. **Verify Tables Were Created**
   - In the left sidebar, click on "Table Editor"
   - You should now see these tables:
     - `community_posts`, `post_likes`, `post_comments`
     - `conversations`, `messages`
     - `knowledge_articles`, `article_likes`, `article_bookmarks`

## Tables Created

### Community Posts
- **community_posts**: Forum posts (questions, tips, success stories, discussions)
- **post_likes**: Tracks which users liked which posts
- **post_comments**: Comments on community posts (for future use)

### Messaging
- **conversations**: Direct message conversations between users
- **messages**: Individual messages in conversations

### Knowledge Base
- **knowledge_articles**: Curated farming articles and guides
- **article_likes**: Tracks which users liked which articles
- **article_bookmarks**: User bookmarks for saving articles

## Security (RLS)

All tables have Row Level Security (RLS) enabled with appropriate policies:
- Public read access for community posts and knowledge articles
- Users can only see their own messages
- Users can only modify their own content
- Users can bookmark and like articles

## Next Steps

After running the SQL schemas:
1. All components will automatically start using the database
2. All data will be stored in Supabase instead of local mock data
3. Data will sync across devices for authenticated users
4. Sample knowledge articles will be pre-populated
