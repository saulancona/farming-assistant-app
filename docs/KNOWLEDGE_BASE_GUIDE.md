# Knowledge Base Management Guide

This guide will help you keep your Knowledge Base updated and relevant with the latest farming information.

## 📝 Quick Start: Adding New Articles

### Option 1: Direct SQL Insert (Fastest)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `cdwzoujzkhefbftuqbxg`
3. Click "SQL Editor" in the left sidebar
4. Click "+ New query"
5. Use this template to add a new article:

```sql
INSERT INTO knowledge_articles (title, content, category, crops, author, language)
VALUES (
  'Your Article Title Here',
  E'# Article Heading\n\nYour content with **bold** text and markdown formatting...',
  'planting',  -- Options: planting, pest_control, irrigation, harvesting, marketing, general
  ARRAY['maize', 'wheat'],  -- Array of relevant crops
  'AgroAfrica Team',  -- Author name
  'en'  -- Language code
);
```

6. Click "Run" to add the article

### Option 2: Using Supabase Table Editor (Easier)

1. Go to Supabase Dashboard
2. Click "Table Editor" in the left sidebar
3. Select the `knowledge_articles` table
4. Click "Insert row" button
5. Fill in the form:
   - **title**: Article title
   - **content**: Full article text (supports Markdown)
   - **category**: Choose from dropdown
   - **crops**: Click to add relevant crops as array items
   - **author**: Your name or organization
   - **language**: `en` (or `sw`, `ha`, `am` for other languages)
6. Click "Save"

## ✏️ Markdown Formatting Guide

The Knowledge Base supports these Markdown features:

```markdown
# Main Heading (H1)
## Section Heading (H2)
### Subsection Heading (H3)

**Bold Text** - Use for emphasis

- Bullet point item 1
- Bullet point item 2
  - Nested items work too

1. Numbered list item 1
2. Numbered list item 2

Regular paragraph text goes here.
Use two line breaks to create a new paragraph.
```

## 📂 Article Categories

Choose the most relevant category for your article:

- **planting** - Planting guides, seed selection, soil preparation, timing
- **pest_control** - Pest identification, treatment methods, prevention
- **irrigation** - Water management, irrigation systems, conservation
- **harvesting** - Harvest timing, post-harvest handling, storage
- **marketing** - Pricing, market access, value addition, selling strategies
- **general** - Multi-topic articles or general farming advice

## 🌱 Adding Crop Tags

When adding an article, include relevant crops as tags. This helps farmers find articles specific to their crops.

**Common crops to tag:**
- maize, corn
- wheat
- rice
- beans
- coffee
- tea
- tomatoes
- potatoes
- cassava
- sorghum
- millet
- groundnuts, peanuts
- vegetables
- fruits

**Example SQL with multiple crops:**
```sql
crops: ARRAY['maize', 'beans', 'intercropping']
```

## 🔄 Updating Existing Articles

### Method 1: SQL Update
```sql
UPDATE knowledge_articles
SET
  content = E'# Updated Content\n\nNew information here...',
  updated_at = NOW()
WHERE title = 'Article Title To Update';
```

### Method 2: Table Editor
1. Go to Table Editor → `knowledge_articles`
2. Find the article you want to update
3. Click on the row
4. Edit any field
5. Click "Save"

## 🗑️ Deleting Outdated Articles

```sql
DELETE FROM knowledge_articles
WHERE title = 'Outdated Article Title';
```

Or use Table Editor:
1. Find the article
2. Click the row checkbox
3. Click "Delete" button

## 📊 Popular Article Examples

### Example 1: Seasonal Planting Guide
```sql
INSERT INTO knowledge_articles (title, content, category, crops, author)
VALUES (
  'Maize Planting Calendar for Kenya',
  E'# Maize Planting Calendar\n\n## Long Rains Season (March-May)\n\nBest time for main season planting...\n\n## Short Rains Season (October-December)\n\nSecond planting opportunity...',
  'planting',
  ARRAY['maize', 'corn'],
  'Kenya Agricultural Research Institute'
);
```

### Example 2: Pest Identification
```sql
INSERT INTO knowledge_articles (title, content, category, crops, author)
VALUES (
  'Identifying and Treating Fall Armyworm',
  E'# Fall Armyworm Control Guide\n\n## Identification\n\n- Look for holes in leaves\n- Check for caterpillars inside whorl\n\n## Treatment\n\n### Organic Methods\n- Neem oil spray\n- Hand picking\n\n### Chemical Control\n- Use approved pesticides\n- Apply early morning or evening',
  'pest_control',
  ARRAY['maize', 'sorghum'],
  'Plant Protection Services'
);
```

### Example 3: Marketing Strategy
```sql
INSERT INTO knowledge_articles (title, content, category, crops, author)
VALUES (
  'Getting Better Prices at Local Markets',
  E'# Marketing Your Produce Effectively\n\n## Timing Your Sales\n\n1. Avoid peak harvest times\n2. Store for off-season prices\n3. Use market price data\n\n## Quality Matters\n\n- Clean and grade produce\n- Package attractively\n- Consistent supply builds reputation',
  'marketing',
  ARRAY['general'],
  'Market Development Program'
);
```

## 📱 Multi-Language Support

Add articles in different languages:

**English:**
```sql
language: 'en'
```

**Swahili:**
```sql
language: 'sw'
```

**Hausa:**
```sql
language: 'ha'
```

**Amharic:**
```sql
language: 'am'
```

## 🎯 Best Practices for Quality Content

### 1. Keep It Practical
- Focus on actionable advice farmers can implement
- Include specific measurements, timings, and quantities
- Provide step-by-step instructions

### 2. Use Local Context
- Reference local seasons and climate
- Use familiar crop varieties
- Mention local market conditions
- Include regional best practices

### 3. Stay Current
- Update articles with latest research
- Add new pest/disease information
- Reflect current market trends
- Include recent climate considerations

### 4. Make It Accessible
- Write in simple, clear language
- Break content into sections
- Use bullet points and numbered lists
- Keep paragraphs short

### 5. Add Real Examples
- Include success stories
- Share case studies
- Provide practical examples
- Reference local farmers' experiences

## 📈 Monitoring Article Performance

### Check Popular Articles
```sql
SELECT title, views, likes, category
FROM knowledge_articles
ORDER BY views DESC
LIMIT 10;
```

### Find Low-Performing Articles
```sql
SELECT title, views, created_at
FROM knowledge_articles
WHERE views < 10
ORDER BY created_at DESC;
```

## 🔔 Content Update Schedule

**Recommended Update Frequency:**

- **Seasonal Articles**: Update before each planting season
- **Pest Control**: Review monthly for new threats
- **Market Prices**: Update weekly or as needed
- **General Techniques**: Review quarterly
- **New Technologies**: Add as they become available

## 💡 Content Ideas for Future Articles

### High-Priority Topics
- [ ] Climate-smart agriculture techniques
- [ ] Water conservation methods
- [ ] Organic certification process
- [ ] Mobile money for farmers
- [ ] Cooperative farming benefits
- [ ] Soil health management
- [ ] Crop rotation strategies
- [ ] Farm record keeping
- [ ] Insurance for farmers
- [ ] Value addition techniques

### Seasonal Content
- [ ] Pre-season preparation guides
- [ ] Mid-season maintenance
- [ ] Harvest planning
- [ ] Post-harvest storage

### Region-Specific Topics
- [ ] Highland farming techniques
- [ ] Semi-arid farming strategies
- [ ] Coastal agriculture tips
- [ ] Urban farming methods

## 🆘 Getting Help

If you need help updating content:

1. **Technical Issues**: Check Supabase documentation at https://supabase.com/docs
2. **Content Questions**: Consult with agricultural extension officers
3. **Database Errors**: Review error messages in Supabase SQL Editor
4. **Formatting**: Test Markdown at https://markdownlivepreview.com/

## 📞 Quick Commands Reference

### View all articles
```sql
SELECT id, title, category, views, likes, created_at
FROM knowledge_articles
ORDER BY created_at DESC;
```

### Update article views (automatic, but for reference)
```sql
UPDATE knowledge_articles
SET views = views + 1
WHERE id = 'article-uuid-here';
```

### Get articles by category
```sql
SELECT title, views
FROM knowledge_articles
WHERE category = 'planting'
ORDER BY views DESC;
```

### Find articles about specific crop
```sql
SELECT title, crops
FROM knowledge_articles
WHERE 'maize' = ANY(crops);
```

---

**Remember:** Quality over quantity! It's better to have 20 excellent, up-to-date articles than 100 outdated ones. Focus on content that truly helps farmers improve their practices and livelihoods.

**Last Updated:** 2025-11-07
