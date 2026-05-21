# Client Portal End-to-End Testing Guide

## Overview
This guide provides comprehensive testing instructions for the client portal, covering all features and user flows.

## Prerequisites
1. Backend server running at `http://localhost:8000`
2. Frontend server running at `http://localhost:5000`
3. Browser with DevTools access

## Test Scenarios

### 1. Authentication & Initial Access
**Steps:**
1. Navigate to `http://localhost:5000`
2. If not logged in, you should see login/register form
3. Register a new account or login with existing credentials
4. Verify redirect to client portal home page
5. Check that user data loads correctly

**Expected:**
- Login/Register form appears
- After authentication, redirects to `/client`
- Home tab displays correctly
- User name/email visible in UI

---

### 2. Home Tab
**Steps:**
1. Verify hero slider displays and auto-rotates
2. Scroll through health goals categories
3. Click on a health goal category
4. Verify nutritionist section displays
5. Scroll through testimonials
6. Test navigation to other tabs via bottom navigation

**Expected:**
- All sections load without errors
- Images display correctly
- Navigation works smoothly
- No console errors

---

### 3. Meal Plan Selection & Cart
**Steps:**
1. Browse meal plans on home page
2. Click "Add to Cart" on a meal plan
3. Navigate to Cart tab
4. Verify meal plan appears in cart
5. Update quantity if needed
6. Click "Proceed to Checkout"

**Expected:**
- Meal plan added to cart
- Cart displays correct items and totals
- Checkout button navigates to checkout page

---

### 4. Checkout Flow
**Steps:**
1. On checkout page, verify Step 1: Health Inputs
   - Fill in health goals, target weight, timeline
   - Click "Next"
2. Verify Step 2: Meal Timing
   - Set breakfast, lunch, dinner times
   - Select delivery addresses for each meal
   - Click "Next"
3. Verify Step 3: Consultation
   - Choose consultation preference
   - Select date, time slot, mode if yes
   - Click "Next"
4. Verify Step 4: Summary
   - Review all entered information
   - Click "Complete Checkout"
5. Verify Payment Screen appears
   - Select payment method
   - Complete payment

**Expected:**
- All steps complete successfully
- Data saves between steps
- Payment screen appears after checkout completion
- Payment processes successfully

---

### 5. Post-Payment Flow
**Steps:**
1. After payment success, verify redirect to `/client?tab=orders&scheduleConsultation=true`
2. Check if consultation booking modal opens automatically (if nutritionist assigned)
3. If modal opens:
   - Select date and time
   - Confirm booking
   - Verify success message
4. If modal doesn't open:
   - Check for notification about scheduling consultation
   - Navigate to nutritionist section and book manually

**Expected:**
- Redirects to orders tab
- Consultation modal opens if nutritionist assigned
- Notification appears if nutritionist not assigned
- Booking works correctly

---

### 6. Orders Tab
**Steps:**
1. Navigate to Orders tab
2. Verify order history displays
3. Check subscription details
4. Verify order status updates
5. Test filtering/sorting if available

**Expected:**
- Orders list displays correctly
- Subscription information accurate
- Status updates reflect current state

---

### 7. Cart Management
**Steps:**
1. Add multiple items to cart
2. Update quantities
3. Remove items
4. Verify totals calculate correctly
5. Proceed to checkout

**Expected:**
- Cart updates in real-time
- Totals calculate correctly
- Items persist across navigation

---

### 8. NutriMarket Tab
**Steps:**
1. Navigate to NutriMarket tab
2. Browse products
3. Add products to cart
4. Navigate between market and cart
5. Verify cart updates

**Expected:**
- Products display correctly
- Add to cart works
- Navigation smooth

---

### 9. My Plan Tab
**Steps:**
1. Navigate to My Plan tab
2. View subscription calendar
3. Check meal schedule
4. Verify plan details

**Expected:**
- Calendar displays correctly
- Meal schedule visible
- Plan information accurate

---

### 10. Today's Meals Tab
**Steps:**
1. Navigate to Today's Meals tab
2. View today's meal schedule
3. Check meal status (pending, preparing, packed, delivered)
4. Verify meal details (items, calories, etc.)

**Expected:**
- Today's meals display correctly
- Status updates reflect current state
- Meal details accurate

---

### 11. Delivery Tracking Tab
**Steps:**
1. Navigate to Delivery Tracking tab
2. View active deliveries
3. Check delivery status
4. Verify location updates (if available)

**Expected:**
- Active deliveries display
- Status updates in real-time
- Location tracking works

---

### 12. Meal Logging Tab
**Steps:**
1. Navigate to Meal Logging tab
2. Log a meal as consumed
3. Log a meal as skipped
4. Add notes if available
5. Verify activity is tracked

**Expected:**
- Meal logging works correctly
- Activities saved
- Real-time updates to nutritionist

---

### 13. Progress Report Tab
**Steps:**
1. Navigate to Progress Report tab
2. View weekly reports
3. Check progress metrics
4. Verify report data accuracy

**Expected:**
- Reports display correctly
- Metrics accurate
- Data updates properly

---

### 14. Notifications Tab
**Steps:**
1. Navigate to Notifications tab
2. View notification list
3. Check different notification types
4. Mark notifications as read
5. Test notification interactions

**Expected:**
- Notifications display correctly
- Different types visible
- Mark as read works
- Interactions function properly

---

### 15. Addresses Tab
**Steps:**
1. Navigate to Addresses tab
2. View saved addresses
3. Add new address:
   - Fill in address form
   - Set as default if needed
   - Save
4. Edit existing address
5. Delete address
6. Set default address

**Expected:**
- Addresses display correctly
- CRUD operations work
- Default address updates
- Validation works

---

### 16. Profile Tab
**Steps:**
1. Navigate to Profile tab
2. View profile information
3. Access settings
4. Navigate to addresses
5. Navigate to notifications
6. Test logout

**Expected:**
- Profile displays correctly
- Settings accessible
- Navigation works
- Logout functions properly

---

### 17. Real-time Updates
**Steps:**
1. Open browser DevTools → Network → WS (WebSocket)
2. Perform actions that trigger updates:
   - Create order
   - Update meal status
   - Receive notification
3. Verify WebSocket messages received
4. Check UI updates in real-time

**Expected:**
- WebSocket connection established
- Real-time updates received
- UI updates without refresh
- No connection errors

---

### 18. Error Handling
**Steps:**
1. Test with invalid data
2. Test with network errors
3. Test with expired session
4. Verify error messages display
5. Check error recovery

**Expected:**
- Error messages clear and helpful
- Graceful error handling
- No crashes
- Recovery mechanisms work

---

## Automated Test Results

Run the automated test script:
```bash
python test_client_portal_public.py
```

This tests:
- Server health
- Public endpoints (meal plans, nutritionists)

For full testing with authentication, use the frontend at `http://localhost:5000`

## Test Checklist

- [ ] Authentication works
- [ ] All tabs accessible
- [ ] Navigation smooth
- [ ] Data loads correctly
- [ ] Forms submit successfully
- [ ] Real-time updates work
- [ ] Error handling works
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Performance acceptable

## Known Issues

1. **Authentication Error**: Backend returns 500 error on registration/login
   - **Workaround**: Use existing user account or fix backend auth endpoint
   
2. **User Activities Endpoint**: May return 404
   - **Status**: Endpoint may not be fully implemented

3. **Weekly Reports Endpoint**: May return 404
   - **Status**: Endpoint may not be fully implemented

## Notes

- Most features require authentication
- Real-time features require WebSocket connection
- Some endpoints may not be fully implemented yet
- Test with actual user data for best results

