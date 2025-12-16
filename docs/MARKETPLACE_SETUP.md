# Marketplace Setup Guide

## Database Setup Required

The Marketplace feature requires a new table in your Supabase database. Follow these steps to set it up:

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your AgroAfrica project
3. Click on "SQL Editor" in the left sidebar

### Step 2: Run the Schema File

1. Click "New Query" in the SQL Editor
2. Open the file: `supabase/schema-marketplace.sql`
3. Copy ALL the contents of that file
4. Paste into the SQL Editor
5. Click "Run" or press Ctrl/Cmd + Enter

### Step 3: Verify Table Creation

After running the SQL, verify that:
- The `marketplace_listings` table was created
- Row Level Security (RLS) is enabled
- Policies are in place

You can check by running this query:
```sql
SELECT * FROM marketplace_listings LIMIT 1;
```

If it returns "no rows" or shows column headers, the table is ready!

### Step 4: Test the Marketplace

1. Sign in to AgroAfrica
2. Navigate to "Marketplace" in the sidebar
3. Click "Create Listing"
4. Fill in the form and submit
5. Your listing should appear in the marketplace!

## Troubleshooting

### Error: "relation 'marketplace_listings' does not exist"
**Solution:** The table hasn't been created yet. Run the schema-marketplace.sql file in Supabase.

### Error: "permission denied for table marketplace_listings"
**Solution:** RLS policies aren't set up correctly. Re-run the schema file to ensure policies are created.

### Error: "Failed to save listing"
**Solution:**
1. Check browser console for detailed error
2. Verify you're signed in
3. Ensure all required fields are filled
4. Check Supabase logs for server-side errors

## Security Features

The marketplace has built-in security:

✅ **Read Access:** Anyone can view active listings
✅ **Create Access:** Only authenticated users can create listings
✅ **Update/Delete Access:** Only the owner can edit/delete their own listings
✅ **Server-side Verification:** Ownership is verified both in the UI and database

## Schema Summary

The `marketplace_listings` table includes:
- User information (ID, name, contact)
- Crop details (type, variety, quality)
- Pricing (per unit, total)
- Quantities and units
- Dates (harvest, available from)
- Location and delivery options
- Status tracking
- View counter

All data is automatically timestamped and owner-linked for security.
