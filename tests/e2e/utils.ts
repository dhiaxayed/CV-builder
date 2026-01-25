import { Page, expect } from '@playwright/test';

export async function loginUser(page: Page) {
    // 1. Visit login page
    await page.goto('/auth/signin');

    // 2. Fill in email
    const email = 'testuser@example.com';
    await page.fill('input[type="email"]', email);

    // 3. Intercept the API call
    const apiResponsePromise = page.waitForResponse(response =>
        response.url().includes('/api/auth/send-magic-link') && response.status() === 200
    );

    // 4. Click submit
    await page.click('button[type="submit"]');

    // 5. Get the devLink
    const response = await apiResponsePromise;
    const data = await response.json();

    if (!data.devLink) {
        throw new Error('Dev link not found in response. Ensure NODE_ENV is development.');
    }

    // 6. Navigate to verification link
    await page.goto(data.devLink);

    // 7. Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard/);
}
