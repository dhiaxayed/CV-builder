import { Page, expect } from '@playwright/test';

export async function loginUser(page: Page) {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';

    // 1. Visit login page
    await page.goto('/auth/signin');

    // 2. Fill in email
    const email = `playwright-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
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
    const normalizedDevLink = data.devLink.replace('http://localhost:3000', baseUrl);
    await page.goto(normalizedDevLink);

    // 7. Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard/);
}
