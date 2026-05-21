# Checkout Flow Analysis and Fixes

## Summary

Tested and fixed the checkout flow to ensure proper consultation scheduling after payment.

## Findings

### Current Flow (After Fixes)

1. **Checkout Wizard** collects:
   - Health inputs (goals, preferences) - Step 1
   - Meal timing & delivery addresses - Step 2
   - Consultation preferences - Step 3
   - Summary & Review - Step 4

2. **After Checkout Complete**:
   - Payment screen appears
   - User completes payment

3. **After Payment Success**:
   - Redirects to `/client?tab=orders&scheduleConsultation=true`
   - ClientPortal checks for `scheduleConsultation` query param
   - If nutritionist is assigned, automatically opens BookingCalendar modal
   - If nutritionist not yet assigned, shows toast notification

4. **Backend Notification**:
   - After payment, backend checks if consultation is scheduled
   - If not scheduled, creates in-app notification
   - Notification includes link to schedule consultation

## Changes Made

### 1. CheckoutPage.tsx
- Modified `handlePaymentSuccess` to redirect with `scheduleConsultation=true` flag
- Changed from `/client?tab=orders` to `/client?tab=orders&scheduleConsultation=true`

### 2. ClientPortal.tsx
- Added `useEffect` hook to check for `scheduleConsultation` query param
- Automatically opens BookingCalendar modal if nutritionist is assigned
- Shows toast notification if nutritionist not yet assigned
- Removes query param from URL after processing

### 3. api/endpoints/payments.py
- Added consultation check after payment success
- Creates in-app notification if consultation not scheduled
- Broadcasts notification event to client channel
- Notification includes redirect link to schedule consultation

## Expected Behavior

1. User completes checkout (form data collected during checkout)
2. User completes payment
3. User is redirected to client portal
4. If nutritionist assigned: BookingCalendar modal opens automatically
5. If nutritionist not assigned: Notification appears with reminder to schedule
6. User can schedule consultation via notification or by selecting nutritionist

## Notes

- Form data (meal preferences, address, goals) is collected **DURING** checkout, not after
- This is the correct flow as it ensures all data is collected before payment
- After payment, the focus shifts to scheduling the consultation with the assigned nutritionist

## Testing

To test the flow:
1. Complete checkout with all steps
2. Complete payment
3. Verify redirect to client portal with consultation modal opening (if nutritionist assigned)
4. Verify notification appears if nutritionist not assigned
5. Check backend logs for notification creation

