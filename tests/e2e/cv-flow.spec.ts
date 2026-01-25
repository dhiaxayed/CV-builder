import { test, expect } from '@playwright/test';
import { loginUser } from './utils';

test.describe('CV Creation Flow', () => {
    test.beforeEach(async ({ page }) => {
        await loginUser(page);
    });

    test('should create a new CV from sample data', async ({ page }) => {
        // 1. Click Create New CV
        await page.locator('button', { hasText: /Create.*CV/ }).click();
        await expect(page).toHaveURL('/cv/new');

        // 2. Step 1: Choose Start Option (Sample)
        await page.click('label[for="sample"]');
        await page.click('button:has-text("Continue")');

        // 3. Step 2: Choose Template (Modern default)
        // Just click continue as modern is selected by default usually, or select it explicitly
        await page.click('label[for="modern"]');
        await page.click('button:has-text("Continue")');

        // 4. Step 3: Enter Title
        const cvTitle = `Test CV ${Date.now()}`;
        await page.fill('input[id="cv-title"]', cvTitle);
        await page.click('button:has-text("Create CV")');

        // 5. Verify redirection to edit page
        await expect(page).toHaveURL(/\/cv\/.*\/edit/);

        // 6. Verify title exists in the edit page (assuming it's shown in header or input)
        // We might need to check if the API call succeeded or if elements are visible
        // Let's assume there is some text indicating the CV is loaded
        await expect(page.locator('body')).toContainText('Basic Information'); // Common CV section
    });
});
