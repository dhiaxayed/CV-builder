import { test, expect } from '@playwright/test';
import { loginUser } from './utils';

test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await loginUser(page);
    });

    test('should display dashboard elements', async ({ page }) => {
        // Verify welcome message
        await expect(page.locator('h1')).toContainText('Welcome');

        // Verify "Create New CV" button is present
        await expect(page.locator('button', { hasText: /Create.*CV/ }).first()).toBeVisible();

        // Verify CV list container (even if empty)
        await expect(page.locator('main')).toBeVisible();
    });
});
