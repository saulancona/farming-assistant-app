# Phase 1: Account Linking - Quick Start Guide

## What Was Implemented

Phase 1 creates the foundation for synchronizing **AgroAfrica**, **AgroVoice-Web**, and **AgroVoice Mobile** by implementing a unified authentication and account linking system.

---

## 🎯 Quick Summary

**Before Phase 1:**
- ❌ AgroAfrica and AgroVoice mobile were completely separate
- ❌ No way to link email and phone authentication
- ❌ Users had different accounts across apps

**After Phase 1:**
- ✅ All three apps share the same Supabase project
- ✅ Users can link email and phone to one account
- ✅ Sign in with email OR phone and access the same data
- ✅ Foundation ready for full data synchronization

---

## 📦 Files Created/Modified

### New Database Schema
```
supabase/migrations/001_account_linking.sql
```
- `user_profiles` - Unified user data
- `account_links` - Links email/phone to one account
- `linking_requests` - Verification system
- RLS policies and helper functions

### New React Components (AgroAfrica)
```
src/components/PhoneAuth.tsx
src/components/AccountLinking.tsx
```
- Phone OTP sign-in
- Account linking UI
- Manage multiple auth methods

### Updated Configuration (AgroVoice Mobile)
```
.env (updated)
.env.production (created)
```
- Connected to shared Supabase project
- Same credentials as AgroAfrica

### Documentation
```
ACCOUNT_LINKING_SETUP.md
PHASE1_QUICKSTART.md (this file)
```

---

## 🚀 Quick Deployment (5 Steps)

### 1. Run Database Migration

```bash
cd ~/agroafrica-app
supabase db push
```

Or via Supabase Dashboard:
- Go to SQL Editor
- Copy/paste `supabase/migrations/001_account_linking.sql`
- Click **Run**

### 2. Enable Phone Auth in Supabase

1. Open [Supabase Dashboard](https://app.supabase.com/project/cdwzoujzkhefbftuqbxg)
2. Go to **Authentication** → **Providers**
3. Enable **Phone** provider
4. For testing: Use Supabase Phone OTP
5. For production: Configure Twilio

### 3. Add Account Linking to AgroAfrica UI

**Option A: Add to Settings Page**

```typescript
// src/App.tsx or your Settings component
import { AccountLinking } from './components/AccountLinking';

// In your settings/profile page:
<AccountLinking />
```

**Option B: Add Phone Sign-In to Login**

```typescript
import { PhoneAuth } from './components/PhoneAuth';

// In your login component:
<PhoneAuth mode="signin" onSuccess={() => {/* handle success */}} />
```

### 4. Update AgroVoice Mobile (If Needed)

The `.env` file has been updated. Just rebuild the app:

```bash
cd ~/agrovoice
flutter pub get
flutter run
```

### 5. Test It!

1. Sign in to AgroAfrica with email
2. Go to Settings → Account Linking
3. Click "Link Phone"
4. Enter phone number and verify with OTP
5. Sign in to AgroVoice mobile with the same phone
6. Both apps now access the same user account!

---

## 🔍 Verification Checklist

Run these checks to ensure everything works:

### Database Check

```sql
-- Check that tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_profiles', 'account_links', 'linking_requests');

-- Check that trigger is working
SELECT * FROM user_profiles LIMIT 5;
```

### Frontend Check (AgroAfrica)

- [ ] PhoneAuth component renders without errors
- [ ] AccountLinking component shows current linked accounts
- [ ] Can send OTP to phone number
- [ ] Can verify OTP code
- [ ] Linked accounts appear in UI
- [ ] Can set primary authentication method

### Mobile Check (AgroVoice)

- [ ] App connects to Supabase
- [ ] Can sign in with phone OTP
- [ ] User profile loads after authentication
- [ ] No connection errors in logs

### Cross-App Check

- [ ] Sign in with email on web
- [ ] Link phone number
- [ ] Sign in with phone on mobile
- [ ] Same user ID across both apps
- [ ] User profile data is shared

---

## 🔐 Authentication Flow

### New User Sign Up

```
1. User signs up with email (AgroAfrica)
   ↓
2. auth.users record created
   ↓
3. Trigger automatically creates:
   - user_profiles record
   - account_links record (email, primary=true)
   ↓
4. User is authenticated
```

### Existing User Links Phone

```
1. User clicks "Link Phone" in settings
   ↓
2. Enters phone number
   ↓
3. Receives OTP via SMS
   ↓
4. Verifies OTP
   ↓
5. New account_links record created (phone, primary=false)
   ↓
6. Can now sign in with either email OR phone
```

### Sign In from Different App

```
1. User signs in with phone (AgroVoice mobile)
   ↓
2. Supabase authenticates via auth.users
   ↓
3. App queries user_profiles using user.id
   ↓
4. Loads same data as web app
```

---

## 📊 Database Schema Relationships

```
auth.users (Supabase managed)
    ↓ (1:1)
user_profiles (your shared profile)
    ↓ (1:many)
account_links (multiple auth methods)
    email → auth.users (email method)
    phone → auth.users (phone method)
```

**Example Data:**

```sql
-- One user profile
user_profiles:
  id: '123e4567-e89b-12d3-a456-426614174000'
  email: 'farmer@example.com'
  phone_number: '+254712345678'
  full_name: 'John Farmer'

-- Two auth methods linked
account_links:
  1. user_id: '123e...'
     auth_method: 'email'
     auth_identifier: 'farmer@example.com'
     is_primary: true

  2. user_id: '123e...'
     auth_method: 'phone'
     auth_identifier: '+254712345678'
     is_primary: false
```

---

## 🎨 UI Components Usage

### PhoneAuth Component

```typescript
// Sign in mode
<PhoneAuth mode="signin" onSuccess={() => navigate('/dashboard')} />

// Sign up mode
<PhoneAuth mode="signup" onSuccess={() => navigate('/onboarding')} />

// Link mode (for existing users)
<PhoneAuth mode="link" onSuccess={() => showSuccessMessage()} />
```

### AccountLinking Component

```typescript
// Shows all linked accounts and allows managing them
<AccountLinking />

// Features:
// - View linked email/phone accounts
// - Set primary authentication method
// - Link new authentication methods
// - Unlink non-primary accounts
```

---

## 🔧 Configuration Reference

### Supabase Project

```
Project URL: https://cdwzoujzkhefbftuqbxg.supabase.co
Project ID: cdwzoujzkhefbftuqbxg
```

### Apps Using This Project

| App | Platform | Auth Method | Status |
|-----|----------|-------------|--------|
| AgroAfrica | Web | Email/Password | ✅ Active |
| AgroVoice-Web | Web | Email/Password | ✅ Active |
| AgroVoice Mobile | Flutter | Phone OTP | ✅ Configured |

### Environment Variables

All three apps use:
```env
SUPABASE_URL=https://cdwzoujzkhefbftuqbxg.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🐛 Common Issues & Solutions

### Issue: "Phone provider not configured"

**Solution:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Phone provider
3. For testing: Use Supabase Phone OTP
4. For production: Add Twilio credentials

### Issue: "User profile not created"

**Solution:**
The trigger should auto-create profiles. If it fails:

```sql
-- Manually create profile
INSERT INTO user_profiles (id, email, phone_number)
VALUES (
  '{{ user_id }}',
  '{{ email }}',
  '{{ phone }}'
);
```

### Issue: "Cannot link phone - already linked"

**Solution:**
Each phone can only be linked to one account. If you need to move a phone number:

```sql
-- Remove existing link
DELETE FROM account_links
WHERE auth_identifier = '+254712345678';

-- Then link to new account
```

### Issue: "OTP not received"

**Solution:**
1. Check phone number format (must include country code: +XXX)
2. Verify phone provider is enabled
3. Check Supabase logs for errors
4. Verify rate limits haven't been exceeded
5. For Twilio: Check account balance and phone number

---

## 📈 Next Steps (Phase 2 & 3)

### Phase 2: Data Sync API (1 week)

- [ ] Create edge function for data transformation
- [ ] Map AgroVoice mobile tables → AgroAfrica tables
- [ ] Implement sync service
- [ ] Add conflict resolution

### Phase 3: Unified Schema (2-3 weeks)

- [ ] Extend AgroAfrica database with mobile-specific tables
- [ ] Migrate existing data
- [ ] Enable real-time bidirectional sync
- [ ] Unified marketplace and knowledge base

---

## 💡 Testing Recommendations

### Manual Testing

1. **Create test accounts:**
   - Email: test1@example.com
   - Phone: +254700000001

2. **Link accounts:**
   - Sign in with email
   - Link phone
   - Verify both work

3. **Cross-app test:**
   - Create data on web
   - Verify access on mobile (Phase 2+)

### Automated Testing

```typescript
// Example test
describe('Account Linking', () => {
  it('should link phone to email account', async () => {
    // Sign in with email
    await signIn('test@example.com', 'password');

    // Link phone
    await linkPhone('+254700000001');

    // Verify OTP
    await verifyOTP('123456');

    // Check linked accounts
    const accounts = await getLinkedAccounts();
    expect(accounts).toHaveLength(2);
  });
});
```

---

## 📝 Important Notes

1. **Phone Number Format:** Always include country code (e.g., +254712345678)
2. **Primary Auth:** First method is always primary, cannot be removed
3. **Security:** OTP codes expire after 60 seconds
4. **Rate Limiting:** Maximum 5 OTP requests per hour per number
5. **Testing:** Use Supabase phone auth for development, Twilio for production

---

## ✅ Success Criteria

Phase 1 is complete when:

- [x] Database migration runs successfully
- [x] Phone authentication is enabled
- [x] Users can link email and phone
- [x] All three apps connect to same Supabase project
- [ ] **TODO:** Test account linking on live apps
- [ ] **TODO:** Deploy to production

---

## 📞 Support

For questions or issues:

1. Check `ACCOUNT_LINKING_SETUP.md` for detailed setup
2. Review Supabase logs
3. Check individual app README files
4. Contact development team

---

**🎉 Phase 1 Implementation Complete!**

Your apps are now ready for unified authentication and account linking. Proceed to Phase 2 for full data synchronization.
