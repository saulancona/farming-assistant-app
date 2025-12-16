-- ============================================
-- KNOWLEDGE ARTICLES SCHEMA
-- ============================================
-- Run this script in your Supabase SQL Editor to create the knowledge articles table

-- ============================================
-- KNOWLEDGE ARTICLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('planting', 'pest_control', 'irrigation', 'harvesting', 'marketing', 'general')),
  crops TEXT[] DEFAULT '{}',
  author TEXT NOT NULL,
  image_url TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  language TEXT DEFAULT 'en'
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_category ON knowledge_articles(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_created_at ON knowledge_articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_views ON knowledge_articles(views DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_likes ON knowledge_articles(likes DESC);

-- ============================================
-- ARTICLE LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS article_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES knowledge_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(article_id, user_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_article_likes_article_id ON article_likes(article_id);
CREATE INDEX IF NOT EXISTS idx_article_likes_user_id ON article_likes(user_id);

-- ============================================
-- ARTICLE BOOKMARKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS article_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES knowledge_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(article_id, user_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_article_bookmarks_article_id ON article_bookmarks(article_id);
CREATE INDEX IF NOT EXISTS idx_article_bookmarks_user_id ON article_bookmarks(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_bookmarks ENABLE ROW LEVEL SECURITY;

-- Knowledge Articles: Anyone can read, only authenticated users can create/update
CREATE POLICY "Anyone can view articles" ON knowledge_articles FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create articles" ON knowledge_articles FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authors can update their articles" ON knowledge_articles FOR UPDATE USING (true);
CREATE POLICY "Authors can delete their articles" ON knowledge_articles FOR DELETE USING (true);

-- Article Likes: Users can like articles
CREATE POLICY "Anyone can view likes" ON article_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like articles" ON article_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike their own likes" ON article_likes FOR DELETE USING (auth.uid() = user_id);

-- Article Bookmarks: Users can bookmark articles
CREATE POLICY "Users can view their bookmarks" ON article_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can bookmark articles" ON article_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their bookmarks" ON article_bookmarks FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_knowledge_articles_updated_at ON knowledge_articles;
CREATE TRIGGER update_knowledge_articles_updated_at
  BEFORE UPDATE ON knowledge_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment article likes count
CREATE OR REPLACE FUNCTION increment_article_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE knowledge_articles
  SET likes = likes + 1
  WHERE id = NEW.article_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement article likes count
CREATE OR REPLACE FUNCTION decrement_article_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE knowledge_articles
  SET likes = likes - 1
  WHERE id = OLD.article_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Triggers for likes count
DROP TRIGGER IF EXISTS increment_article_likes_on_insert ON article_likes;
CREATE TRIGGER increment_article_likes_on_insert
  AFTER INSERT ON article_likes
  FOR EACH ROW
  EXECUTE FUNCTION increment_article_likes_count();

DROP TRIGGER IF EXISTS decrement_article_likes_on_delete ON article_likes;
CREATE TRIGGER decrement_article_likes_on_delete
  AFTER DELETE ON article_likes
  FOR EACH ROW
  EXECUTE FUNCTION decrement_article_likes_count();

-- Function to increment article views
CREATE OR REPLACE FUNCTION increment_article_views(article_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE knowledge_articles
  SET views = views + 1
  WHERE id = article_id_param;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DATA - Sample Knowledge Articles
-- ============================================

INSERT INTO knowledge_articles (title, content, category, crops, author, language) VALUES
(
  'Best Time to Plant Maize in East Africa',
  E'# Optimal Maize Planting Seasons\n\nMaize is best planted during the long rains season (March-May) or short rains season (October-December) in East Africa.\n\n## Key Considerations:\n\n1. **Soil Preparation**: Begin land preparation 2-3 weeks before planting\n2. **Seed Selection**: Choose certified seeds suited to your region\n3. **Spacing**: Plant at 75cm between rows and 25cm between plants\n4. **Depth**: Plant seeds 5cm deep\n\n## Regional Variations:\n\n- **Kenya**: Long rains (March-May), Short rains (October-November)\n- **Tanzania**: October-December (main season)\n- **Uganda**: February-April (first season), August-September (second season)\n\n## Tips for Success:\n\n- Test soil pH (ideal: 5.5-7.0)\n- Apply basal fertilizer at planting\n- Control weeds in first 6 weeks\n- Monitor for pests like fall armyworm',
  'planting',
  ARRAY['maize', 'corn'],
  'AgroAfrica Team',
  'en'
),
(
  'Organic Pest Control Methods',
  E'# Natural Pest Management\n\nOrganic pest control protects your crops while maintaining environmental health and reducing costs.\n\n## Effective Methods:\n\n### 1. Neem Oil Spray\n- Mix 2 tablespoons neem oil with 1 liter water\n- Add a few drops of liquid soap\n- Spray on affected plants in the evening\n\n### 2. Companion Planting\n- Plant marigolds to repel aphids\n- Use basil near tomatoes to deter pests\n- Intercrop with aromatic herbs\n\n### 3. Manual Removal\n- Inspect crops regularly\n- Remove pests by hand in early morning\n- Destroy affected plant parts\n\n### 4. Biological Control\n- Encourage beneficial insects (ladybugs, lacewings)\n- Use Bacillus thuringiensis (Bt) for caterpillars\n- Introduce parasitic wasps\n\n## Prevention Tips:\n\n- Rotate crops annually\n- Maintain healthy soil\n- Remove crop residues after harvest\n- Use resistant varieties',
  'pest_control',
  ARRAY['general'],
  'AgroAfrica Team',
  'en'
),
(
  'Drip Irrigation: A Water-Efficient Solution',
  E'# Introduction to Drip Irrigation\n\nDrip irrigation can reduce water usage by 30-50% while increasing crop yields.\n\n## Benefits:\n\n- **Water Efficiency**: Delivers water directly to roots\n- **Reduced Diseases**: Keeps foliage dry\n- **Fertilizer Savings**: Allows precise nutrient delivery\n- **Weed Control**: Water only reaches crop roots\n\n## System Components:\n\n1. Water source (tank, well, or tap)\n2. Filter to prevent clogging\n3. Main distribution pipes\n4. Drip lines or emitters\n5. Pressure regulator\n\n## Installation Steps:\n\n1. Plan your layout on paper\n2. Install main line along field length\n3. Connect drip lines at each plant row\n4. Place emitters near each plant\n5. Test system before planting\n\n## Maintenance:\n\n- Flush lines weekly\n- Clean filters regularly\n- Check for leaks or clogs\n- Winterize in cold climates\n\n## Cost Considerations:\n\nSmall-scale systems (0.25 acre) cost approximately:\n- Basic gravity system: $150-300\n- Pump-based system: $400-800',
  'irrigation',
  ARRAY['general'],
  'AgroAfrica Team',
  'en'
),
(
  'Post-Harvest Handling Best Practices',
  E'# Proper Harvest Handling\n\nGood post-harvest practices can reduce losses by up to 50% and improve market value.\n\n## Timing Your Harvest:\n\n- Harvest at proper maturity stage\n- Choose cool parts of the day (early morning)\n- Avoid harvesting wet crops\n- Use sharp, clean tools\n\n## Immediate Actions:\n\n### Cooling\n- Reduce field heat quickly\n- Use shade or cold storage\n- Target temperature depends on crop\n\n### Cleaning\n- Remove dirt and debris gently\n- Avoid washing unless necessary\n- Dry thoroughly if washed\n\n### Sorting\n- Grade by size and quality\n- Remove damaged produce\n- Separate by ripeness\n\n## Storage Guidelines:\n\n### Grains (Maize, Beans)\n- Dry to 13-14% moisture content\n- Store in clean, dry containers\n- Use hermetic bags for long-term storage\n- Check regularly for pests\n\n### Vegetables\n- Most require cool (10-15°C), humid conditions\n- Use ventilated crates\n- Avoid direct sunlight\n- Don''t stack too high\n\n### Fruits\n- Handle carefully to avoid bruising\n- Store ethylene-producing fruits separately\n- Monitor ripening daily\n\n## Marketing Tips:\n\n- Package attractively\n- Label with farm details\n- Maintain consistent quality\n- Deliver on schedule',
  'harvesting',
  ARRAY['general'],
  'AgroAfrica Team',
  'en'
),
(
  'Understanding Market Prices and Negotiation',
  E'# Maximizing Farm Income Through Better Marketing\n\n## Market Research:\n\n### Before Planting:\n- Study price trends for last 3 years\n- Identify high-demand periods\n- Research local and distant markets\n- Consider storage options\n\n### During Growing Season:\n- Monitor current prices weekly\n- Track competitor production\n- Build relationships with buyers\n- Join farmer groups for collective marketing\n\n## Pricing Strategies:\n\n### Know Your Costs:\n1. Calculate total production costs\n2. Add desired profit margin\n3. Compare with market prices\n4. Adjust timing if needed\n\n### Value Addition:\n- Clean and grade produce\n- Package attractively\n- Offer consistent quality\n- Provide delivery services\n\n## Negotiation Tips:\n\n1. **Know Your Worth**: Understand true value of your produce\n2. **Be Patient**: Don''t accept first offer if too low\n3. **Build Relationships**: Long-term buyers often pay better\n4. **Have Alternatives**: Multiple buyers give you leverage\n5. **Timing Matters**: Sell when supply is low\n\n## Market Channels:\n\n### Direct Sales:\n- Farm gate sales\n- Farmers markets\n- Direct to restaurants/hotels\n- Online platforms\n\n### Indirect Sales:\n- Cooperatives\n- Wholesalers\n- Aggregators\n- Processors\n\n## Digital Marketing:\n\n- Use social media to showcase produce\n- Join WhatsApp marketing groups\n- List on agricultural e-commerce platforms\n- Share farm story to build brand',
  'marketing',
  ARRAY['general'],
  'AgroAfrica Team',
  'en'
);
