import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('should allow user to login via magic link (dev mode)', async ({ page }) => {
        // 1. Visit login page
        await page.goto('/auth/signin');

        // 2. Fill in email
        const email = 'testuser@example.com';
        await page.fill('input[type="email"]', email);

        // 3. Intercept the API call to capture the devLink
        const apiResponsePromise = page.waitForResponse(response =>
            response.url().includes('/api/auth/send-magic-link') && response.status() === 200
        );

        // 4. Click submit
        await page.click('button[type="submit"]');

        // 5. Get the response body
        const response = await apiResponsePromise;
        const data = await response.json();

        // Check if we got the devLink (only available in NODE_ENV=development)
        // Note: The app must be running in development mode for this to work.
        expect(data.success).toBe(true);
        expect(data.devLink).toBeTruthy();

        // 6. Navigate to the verification link
        await page.goto(data.devLink);

        // 7. Verify we are redirected to dashboard
        await expect(page).toHaveURL(/\/dashboard/);

        // Optional: Check for some dashboard element
        await expect(page.locator('h1')).toContainText('Welcome');
    });
});
