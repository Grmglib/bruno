import { test, expect } from '../../../playwright';
import * as path from 'path';
import * as fs from 'fs';
import { closeAllCollections } from '../../utils/page';

test.describe('Import Apidog Collection', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should import Apidog project modules into a project subfolder', async ({ page, createTmpDir }) => {
    const apidogFile = path.resolve(__dirname, 'fixtures', 'apidog-minimal.json');
    const importDir = await createTmpDir('apidog-import-test');

    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    await page.setInputFiles('input[type="file"]', apidogFile);

    const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
    await locationModal.waitFor({ state: 'visible', timeout: 10000 });
    await expect(locationModal.getByText('Sample API Project (1 modules)')).toBeVisible();
    await expect(locationModal.getByTestId('apidog-import-info')).toBeVisible();
    await expect(locationModal.getByText('Billing')).toBeVisible();

    await page.locator('#collection-location').fill(importDir);
    await locationModal.getByRole('button', { name: 'Import' }).click();

    await expect(page.locator('#sidebar-collection-name').getByText('Billing')).toBeVisible({ timeout: 15000 });

    const collectionPath = path.join(importDir, 'sample_api_project', 'Billing');
    expect(fs.existsSync(collectionPath)).toBe(true);
    expect(fs.existsSync(path.join(collectionPath, 'bruno.json'))).toBe(true);
  });
});
