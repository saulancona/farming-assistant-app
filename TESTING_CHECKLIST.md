# AgroAfrica Manual Testing Checklist

Use this checklist to verify all features work correctly. Test on both desktop and mobile.

## 1. Authentication
- [ ] Sign up with email/password
- [ ] Sign in with email/password
- [ ] Sign in with Google OAuth
- [ ] Sign out
- [ ] Password reset flow
- [ ] Session persists after page refresh
- [ ] Protected routes redirect to login when not authenticated

## 2. Dashboard
- [ ] Dashboard loads without errors
- [ ] Stats cards display correctly (fields, expenses, income, tasks)
- [ ] Quick action buttons work
- [ ] Recent activity shows correctly
- [ ] Navigation to other sections works
- [ ] Weather widget displays (if location set)

## 3. Fields Management
- [ ] View list of fields
- [ ] Add new field with all required data
- [ ] Edit existing field
- [ ] Delete field (with confirmation)
- [ ] Field details show correctly
- [ ] Crop type selection works
- [ ] Size/area input validates correctly
- [ ] Read-only mode works for non-authenticated users

## 4. Expense Tracking
- [ ] View expense list
- [ ] Add new expense
- [ ] Select expense category
- [ ] Link expense to field (optional)
- [ ] Edit existing expense
- [ ] Delete expense
- [ ] Date picker works
- [ ] Amount validation works
- [ ] Filter by date range
- [ ] Filter by category

## 5. Income Tracking
- [ ] View income list
- [ ] Add new income entry
- [ ] Select income source/category
- [ ] Link to field (optional)
- [ ] Edit existing income
- [ ] Delete income
- [ ] Date picker works
- [ ] Amount validation works

## 6. Task Management
- [ ] View task list
- [ ] Add new task
- [ ] Set task priority
- [ ] Set due date
- [ ] Link to field (optional)
- [ ] Mark task as complete
- [ ] Edit task
- [ ] Delete task
- [ ] Filter by status (pending/completed)
- [ ] Overdue tasks highlighted

## 7. Inventory Management
- [ ] View inventory list
- [ ] Add new inventory item
- [ ] Set quantity and unit
- [ ] Edit item
- [ ] Delete item
- [ ] Low stock warnings display

## 8. Storage Bins
- [ ] View storage bins
- [ ] Add new bin
- [ ] Set capacity
- [ ] Edit bin details
- [ ] Delete bin
- [ ] Capacity usage displayed correctly

## 9. Weather
- [ ] Weather data loads for location
- [ ] Current conditions display
- [ ] Forecast displays
- [ ] Refresh button works
- [ ] Location change works
- [ ] Weather alerts show (if any)

## 10. Market Prices
- [ ] International prices load
- [ ] Price trends display
- [ ] Add local market price
- [ ] Toggle between international/local view
- [ ] Refresh prices works
- [ ] Price Checker challenge tracks correctly (unique days only)

## 11. AI Chat (Farming Assistant)
- [ ] Chat interface loads
- [ ] Send text message works
- [ ] AI responds appropriately
- [ ] Message history displays
- [ ] Voice input works (if supported)
- [ ] Suggested prompts work

## 12. Pest Control / AI Diagnosis
- [ ] Upload photo works
- [ ] AI analysis returns results
- [ ] Treatment recommendations display
- [ ] Save diagnosis to history
- [ ] Photo challenge integration works

## 13. Community
- [ ] View community posts
- [ ] Create new post
- [ ] Edit own post
- [ ] Delete own post (with confirmation)
- [ ] Like/react to posts
- [ ] Comment on posts
- [ ] Edit own comments
- [ ] Delete own comments
- [ ] Filter posts by category
- [ ] Community Voice challenge tracks correctly

## 14. Messages
- [ ] View conversations
- [ ] Send message
- [ ] Receive messages
- [ ] New message notifications

## 15. Knowledge Base
- [ ] Browse articles
- [ ] Search articles
- [ ] View article content
- [ ] Mark article as complete
- [ ] Watch video content
- [ ] Learning Sprint challenge tracks correctly

## 16. Marketplace
- [ ] Browse listings
- [ ] Create new listing
- [ ] Edit own listing
- [ ] Delete listing
- [ ] Contact seller
- [ ] Filter by category
- [ ] Search listings

## 17. Analytics
- [ ] Charts load correctly
- [ ] Expense breakdown shows
- [ ] Income breakdown shows
- [ ] Profit/loss calculation correct
- [ ] Date range filter works
- [ ] Export data works

## 18. Calendar
- [ ] Calendar view loads
- [ ] Events display correctly
- [ ] Add new event
- [ ] Edit event
- [ ] Delete event
- [ ] Task deadlines show
- [ ] Planting/harvest dates show

## 19. Gamification - Rewards
- [ ] XP display correct
- [ ] Level display correct
- [ ] Progress to next level shows
- [ ] Achievement list displays
- [ ] Unlocked achievements show
- [ ] Locked achievements show requirements
- [ ] Points balance displays

## 20. Gamification - Challenges
- [ ] Weekly challenges list displays
- [ ] Challenge progress updates correctly
- [ ] Photo Patrol challenge works (upload 3 photos)
- [ ] Price Checker challenge works (4 UNIQUE days)
- [ ] Community Voice challenge works (2 posts)
- [ ] Learning Sprint challenge works (2 articles/videos)
- [ ] Task Master challenge works (5 tasks)
- [ ] Challenge completion awards XP/points
- [ ] Completed challenges show in history

## 21. Photo Challenges
- [ ] Photo challenges display
- [ ] Upload photo for challenge
- [ ] AI analysis works
- [ ] Progress updates
- [ ] Rewards awarded on completion

## 22. Missions
- [ ] Available missions display
- [ ] Start a mission
- [ ] View mission progress
- [ ] Complete mission steps
- [ ] Upload evidence photos
- [ ] Mission completion rewards

## 23. Rewards Shop
- [ ] View shop items
- [ ] Filter by category
- [ ] Points balance displays
- [ ] Redeem item works
- [ ] Insufficient points shows error
- [ ] Redemption history shows

## 24. Referrals
- [ ] Referral code generates
- [ ] Copy code works
- [ ] Share link works
- [ ] Referral count displays
- [ ] Referral milestones show
- [ ] Rewards for referrals work

## 25. Teams
- [ ] Create team
- [ ] Join team
- [ ] View team members
- [ ] Team challenges display
- [ ] Leave team

## 26. Story Quests
- [ ] Quests display
- [ ] Start quest
- [ ] Progress through chapters
- [ ] Complete quest rewards

## 27. Learning Progress
- [ ] Learning modules display
- [ ] Track video progress
- [ ] Track article progress
- [ ] Completion awards XP
- [ ] Leaderboard displays

## 28. Settings
- [ ] Profile settings load
- [ ] Update display name
- [ ] Update farm location
- [ ] Language toggle works (EN/SW)
- [ ] Theme/preferences save
- [ ] Notification settings work

## 29. Streak System
- [ ] Daily streak displays
- [ ] Streak increments on daily activity
- [ ] Streak bonus XP awarded
- [ ] Streak freeze available
- [ ] Streak resets if day missed (without freeze)

## 30. Voice Features
- [ ] Text-to-speech works (Read buttons)
- [ ] Voice input works (where available)
- [ ] Voice labels accessible
- [ ] Talking buttons work

## 31. Mobile Responsiveness
- [ ] All pages render correctly on mobile
- [ ] Navigation menu works on mobile
- [ ] Touch interactions work
- [ ] Forms are usable on mobile
- [ ] Charts scale correctly

## 32. PWA Features
- [ ] App installable
- [ ] Offline indicator shows
- [ ] Cached content available offline
- [ ] Push notifications work (if enabled)

## 33. Error Handling
- [ ] Network errors show friendly message
- [ ] Form validation errors display
- [ ] 404 pages handled
- [ ] Error boundary catches crashes
- [ ] Retry buttons work

## 34. Performance
- [ ] Initial load under 3 seconds
- [ ] Page transitions smooth
- [ ] No visible lag on interactions
- [ ] Images load progressively
- [ ] Lazy loading works for tabs

---

## Test Results Summary

| Category | Pass | Fail | Notes |
|----------|------|------|-------|
| Authentication | | | |
| Dashboard | | | |
| Fields | | | |
| Expenses | | | |
| Income | | | |
| Tasks | | | |
| Inventory | | | |
| Storage | | | |
| Weather | | | |
| Markets | | | |
| AI Chat | | | |
| Pest Control | | | |
| Community | | | |
| Messages | | | |
| Knowledge | | | |
| Marketplace | | | |
| Analytics | | | |
| Calendar | | | |
| Rewards | | | |
| Challenges | | | |
| Photo Challenges | | | |
| Missions | | | |
| Shop | | | |
| Referrals | | | |
| Teams | | | |
| Story Quests | | | |
| Learning | | | |
| Settings | | | |
| Streaks | | | |
| Voice | | | |
| Mobile | | | |
| PWA | | | |
| Errors | | | |
| Performance | | | |

**Tested By:** _______________
**Date:** _______________
**Device/Browser:** _______________
**Overall Status:** _______________
