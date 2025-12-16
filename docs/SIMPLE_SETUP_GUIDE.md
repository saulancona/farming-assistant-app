# Simple Setup Guide - Account Linking

## Before You Start

Make sure you have:
- [ ] Access to your Supabase dashboard
- [ ] Terminal/command prompt open
- [ ] Your code editor open

**Time needed:** About 15 minutes

---

## Step 1: Run the Database Migration

This creates the new tables in your database.

### Option A: Using Supabase Dashboard (Easiest)

1. Open your browser and go to: https://app.supabase.com

2. Sign in to your account

3. Click on your project: **cdwzoujzkhefbftuqbxg**

4. On the left sidebar, click **SQL Editor**

5. Click **New Query** button

6. Open the file `C:\Users\saula\agroafrica-app\supabase\migrations\001_account_linking.sql` in your code editor

7. Copy ALL the text from that file (Ctrl+A, then Ctrl+C)

8. Paste it into the Supabase SQL Editor (Ctrl+V)

9. Click the **Run** button (or press Ctrl+Enter)

10. You should see: "Success. No rows returned"

✅ **Done!** Your database now has the new tables.

### Option B: Using Command Line

```bash
cd C:\Users\saula\agroafrica-app
supabase db push
```

If you get an error, use Option A instead.

---

## Step 2: Enable Phone Authentication

This allows users to sign in with phone numbers.

1. Go back to your Supabase dashboard: https://app.supabase.com

2. Make sure you're on project **cdwzoujzkhefbftuqbxg**

3. On the left sidebar, click **Authentication**

4. Click **Providers** tab

5. Scroll down and find **Phone**

6. Click the **Phone** row to expand it

7. Toggle the switch to **Enable Phone Sign-ups**

8. Under "Phone provider", select **Enable Phone Provider (via Supabase)**

9. Leave other settings as default

10. Click **Save** at the bottom

✅ **Done!** Users can now sign in with phone numbers.

**Note:** For testing, Supabase provides free SMS. For production, you'll need to configure Twilio later.

---

## Step 3: Verify Database Tables Were Created

Let's check that everything worked.

1. In Supabase dashboard, click **Table Editor** on the left sidebar

2. You should see these new tables in the list:
   - `user_profiles`
   - `account_links`
   - `linking_requests`

3. If you see them, great! ✅

4. If you don't see them, go back to Step 1 and try again.

---

## Step 4: Add the UI Components to AgroAfrica

Now let's add the account linking page to your web app.

### 4.1: Find Your Settings/Profile Component

Open your code editor and navigate to where you handle user settings.

Common locations:
- `src/components/Settings.tsx`
- `src/components/Profile.tsx`
- `src/App.tsx`

If you're not sure, let's check:

```bash
cd C:\Users\saula\agroafrica-app
dir src\components\Settings.tsx
```

### 4.2: Import the AccountLinking Component

Add this line at the top of your settings/profile file:

```typescript
import { AccountLinking } from './AccountLinking';
```

### 4.3: Add the Component to Your UI

Inside your settings page component, add:

```typescript
<AccountLinking />
```

**Example:**

```typescript
// Settings.tsx or Profile.tsx
import { AccountLinking } from './AccountLinking';

function Settings() {
  return (
    <div>
      <h1>Settings</h1>

      {/* Your existing settings */}

      {/* Add this new section */}
      <AccountLinking />
    </div>
  );
}
```

✅ **Done!** The account linking UI is now in your app.

---

## Step 5: Start Your Development Server

Let's test it out!

1. Open terminal

2. Navigate to agroafrica-app:
   ```bash
   cd C:\Users\saula\agroafrica-app
   ```

3. Install dependencies (if you haven't):
   ```bash
   npm install
   ```

4. Start the dev server:
   ```bash
   npm run dev
   ```

5. Open your browser to the URL shown (usually http://localhost:5173)

✅ **Done!** Your app is running.

---

## Step 6: Test Account Linking

### 6.1: Sign In with Your Email

1. Open your browser to the app

2. Sign in with your existing email and password

3. Navigate to Settings (or wherever you added the AccountLinking component)

4. You should see a section called "Linked Accounts"

### 6.2: Link a Phone Number

1. In the "Link Another Account" section, click **Link Phone**

2. A popup will appear

3. Enter a phone number with country code (example: +254712345678)
   - Kenya: +254
   - Nigeria: +234
   - USA: +1

4. Click **Send Verification Code**

5. Check your phone for an SMS with a 6-digit code

6. Enter the code in the popup

7. Click **Verify**

8. You should see "Phone number linked successfully!"

✅ **Done!** Your email and phone are now linked.

---

## Step 7: Update AgroVoice Mobile (Optional)

Only do this if you want to test the mobile app.

1. Open terminal

2. Navigate to agrovoice:
   ```bash
   cd C:\Users\saula\agrovoice
   ```

3. The `.env` file has already been updated with the correct Supabase credentials

4. Rebuild the app:
   ```bash
   flutter pub get
   flutter run
   ```

5. Sign in with the phone number you linked in Step 6

6. You should be able to access your account!

✅ **Done!** Mobile app is connected.

---

## Quick Test Checklist

After completing all steps, verify:

- [ ] Can sign in to AgroAfrica with email
- [ ] Can see "Linked Accounts" section in settings
- [ ] Can click "Link Phone" button
- [ ] Can receive SMS with verification code
- [ ] Can verify code and link phone
- [ ] Linked phone appears in the accounts list
- [ ] Can sign in to AgroVoice mobile with linked phone (optional)

---

## Troubleshooting

### Problem: "Table 'user_profiles' does not exist"

**Solution:** The database migration didn't run. Go back to Step 1.

### Problem: "Phone provider not configured"

**Solution:** Phone authentication isn't enabled. Go back to Step 2.

### Problem: "No SMS received"

**Solutions:**
1. Wait 1-2 minutes (sometimes delayed)
2. Check phone number has country code (+XXX)
3. Try with a different phone number
4. Check Supabase logs: Dashboard → Authentication → Logs

### Problem: "Cannot find module './AccountLinking'"

**Solution:** Make sure the import path is correct. The file is at:
```
src/components/AccountLinking.tsx
```

If your settings file is in a different folder, adjust the path:
```typescript
// If in src/pages/Settings.tsx
import { AccountLinking } from '../components/AccountLinking';
```

### Problem: "npm run dev" fails

**Solutions:**
1. Make sure you're in the right directory:
   ```bash
   cd C:\Users\saula\agroafrica-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Check for errors in the terminal

---

## What If I Get Stuck?

1. **Check the terminal** for error messages

2. **Check the browser console** (F12 → Console tab)

3. **Check Supabase logs**:
   - Go to Supabase Dashboard
   - Click "Logs" on the left
   - Look for recent errors

4. **Start over** from Step 1 if needed

---

## Next Steps After Setup

Once everything is working:

1. **Test thoroughly** with different phone numbers

2. **Add phone sign-in** to your login page (optional)

3. **Deploy to production** when ready

4. **Move to Phase 2** for full data synchronization

---

## Quick Reference

### Important Files Created

```
agroafrica-app/
├── supabase/migrations/001_account_linking.sql  ← Database schema
├── src/components/PhoneAuth.tsx                 ← Phone auth UI
├── src/components/AccountLinking.tsx            ← Account management
└── SIMPLE_SETUP_GUIDE.md                        ← This file

agrovoice/
└── .env                                         ← Updated config
```

### Important Links

- **Supabase Dashboard:** https://app.supabase.com
- **Your Project:** https://app.supabase.com/project/cdwzoujzkhefbftuqbxg
- **Local App:** http://localhost:5173 (after npm run dev)

### Commands

```bash
# Start AgroAfrica web app
cd C:\Users\saula\agroafrica-app
npm run dev

# Start AgroVoice mobile app
cd C:\Users\saula\agrovoice
flutter run
```

---

## That's It! 🎉

You've successfully set up account linking. Users can now:
- Sign in with email on web
- Sign in with phone on mobile
- Link both methods to one account
- Access the same data from any app

**Questions?** Check the troubleshooting section above or the detailed guide in `ACCOUNT_LINKING_SETUP.md`.
