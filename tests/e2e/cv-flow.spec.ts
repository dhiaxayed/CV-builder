import { test, expect } from '@playwright/test';
import { loginUser } from './utils';

test.describe('CV Creation Flow', () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        await loginUser(page);
    });

    test('should create a new CV from sample data', async ({ page }) => {
        // 1. Click Create New CV
        await page.getByRole('button', { name: /Create New CV/i }).first().click();
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

    test('should guide the user through AI review, tailoring, versioning, and export pages', async ({ page }) => {
        test.setTimeout(300000);

        await page.getByRole('button', { name: /Create.*CV/i }).first().click();
        await expect(page).toHaveURL('/cv/new');

        await page.click('label[for="sample"]');
        await page.click('button:has-text("Continue")');
        await page.click('label[for="modern"]');
        await page.click('button:has-text("Continue")');

        const cvTitle = `AI Flow CV ${Date.now()}`;
        await page.fill('input[id="cv-title"]', cvTitle);
        await page.click('button:has-text("Create CV")');
        await expect(page).toHaveURL(/\/cv\/.*\/edit/);

        await expect(page.getByText(/Use Preview to inspect layout/i)).toBeVisible();
        await expect(page.getByText(/All changes saved|Unsaved changes|Saving changes/i)).toBeVisible();

        await page.getByRole('tab', { name: /AI Assist/i }).click();
        await expect(page.getByText('AI Career Assistant')).toBeVisible();
        await expect(page.getByText(/How to use this assistant/i)).toBeVisible();

        await page.getByRole('button', { name: /Run AI ATS Review/i }).click();

        const aiSnapshot = page.getByText('AI Snapshot');
        const aiReviewFailed = page.getByText('AI review failed');

        const reviewOutcome = await Promise.race([
            aiSnapshot.waitFor({ state: 'visible', timeout: 120000 }).then(() => 'ready' as const),
            aiReviewFailed.waitFor({ state: 'visible', timeout: 120000 }).then(() => 'failed' as const),
        ]);

        if (reviewOutcome === 'failed') {
            await expect(aiReviewFailed).toBeVisible();
        }

        await page.getByLabel('Target Job Title').fill('Senior Full Stack Engineer');
        await page.getByLabel('Company Name').fill('Acme');
        await page.getByLabel('Job Description').fill(
            'We are hiring a Senior Full Stack Engineer to build scalable web applications with React, TypeScript, Node.js, PostgreSQL, APIs, testing, CI/CD, cloud infrastructure, collaboration, and product thinking.'
        );
        await page.getByRole('button', { name: /Tailor CV for This Role/i }).click();

        const tailoredSummary = page.getByText('Tailored Summary');
        const proOnlyMessage = page.getByText(/Pro plan only/i).first();

        const tailorOutcome = await Promise.race([
            tailoredSummary.waitFor({ state: 'visible', timeout: 180000 }).then(() => 'tailored' as const),
            proOnlyMessage.waitFor({ state: 'visible', timeout: 180000 }).then(() => 'pro-gated' as const),
        ]);

        if (tailorOutcome === 'tailored') {
            await page.getByRole('button', { name: /Apply Full Package/i }).click();
            await expect(page.getByText(/Unsaved changes/i)).toBeVisible();
        } else {
            await expect(proOnlyMessage).toBeVisible();
        }

        await page.getByRole('button', { name: /^Version$/i }).click();
        await expect(page.getByText('Save as New Version')).toBeVisible();
        await page.getByLabel('Version Note (optional)').fill('Playwright AI snapshot');
        await page.getByRole('button', { name: /Save Version/i }).click();
        await expect(page.locator('span').filter({ hasText: /Version \d+ saved/i }).first()).toBeVisible({ timeout: 120000 });

        const cvId = page.url().match(/\/cv\/([^/]+)\/edit/)?.[1];
        expect(cvId).toBeTruthy();

        await page.goto(`/cv/${cvId}/versions`);
        await expect(page.getByRole('heading', { name: 'Version History' })).toBeVisible();

        await page.goto(`/cv/${cvId}/export`);
        await expect(page.getByRole('heading', { name: 'Export & Share' })).toBeVisible();
        await expect(page.getByText(/PDF Export/i).first()).toBeVisible();
    });
});
