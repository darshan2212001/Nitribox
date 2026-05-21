<!-- 141bec7a-e8ee-448d-864d-6d031ae30613 e4861cb2-abd4-489f-845d-27edca518eba -->
# Fix Image Display Issue

## Root Causes Identified

1. **Database Not Reseeded**: The `api/seed_data.py` file has been updated with local image paths (`/images/weight-loss-plan.jpg`), but the database still contains old data with Unsplash URLs
2. **Frontend Hardcoded Fallbacks**: Components `HealthGoalsCategory.tsx` and `EnhancedNutritionistCard.tsx` have hardcoded Unsplash URLs that override API data
3. **Missing Images**: Only 4 images copied to `client/public/images/` (weight-loss, muscle-gain, pcos, diabetic) - need 2 more meal plan images and 6 nutritionist images
4. **Case Mismatch**: API returns `image_url` (snake_case) but schema converts to `imageUrl` (camelCase) - need to verify this is working

## Implementation Steps

### Step 1: Copy Missing Images to Public Folder

Copy remaining images from `attached_assets/generated_images/` to `client/public/images/`:

- `senior-plan.jpg` (for Senior Citizens & Postpartum plans)
- `nutritionist-1.jpg` through `nutritionist-6.jpg` (from Female/Male nutritionist PNGs)

### Step 2: Reseed Database

Run the seed script to update database with new local image paths:

```bash
python -c "from api.seed_data import seed_database; seed_database()"
```

### Step 3: Update Frontend Components

**File: `client/src/components/HealthGoalsCategory.tsx`**

- Remove hardcoded Unsplash URLs (lines 10-18)
- Update fallback logic to use local paths matching the backend

**File: `client/src/components/EnhancedNutritionistCard.tsx`**

- Remove hardcoded Unsplash URLs in `getNutritionistImage()` function (lines 32-37)
- Update to use local paths (`/images/nutritionist-1.jpg`, etc.)

### Step 4: Verify API Response

Check that `MealPlanResponse` schema correctly converts `image_url` to `imageUrl` for frontend consumption

### Step 5: Test

- Restart API server to reload database
- Check frontend displays all meal plan and nutritionist images correctly
- Verify fallback images work when API doesn't return image_url

### To-dos

- [ ] Create 5 independent Python test scripts with timeout protection
- [ ] Create batch file launchers for each test
- [ ] Create master launch_all_tests.bat orchestrator
- [ ] Create collect_results.py to aggregate test results
- [ ] Create cleanup_processes.bat for process management
- [ ] Execute and verify all tests run in parallel without hanging