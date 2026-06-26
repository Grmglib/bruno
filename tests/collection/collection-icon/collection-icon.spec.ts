import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '../../../playwright';
import { closeAllCollections, openCollection } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Collection icon picker', () => {
  test.afterAll(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should persist a selected lucide icon in bruno.json and show it in the sidebar', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    const collectionPath = collectionFixturePath!;
    const brunoJsonPath = path.join(collectionPath, 'bruno.json');
    const locators = buildCommonLocators(page);

    await test.step('Open the collection', async () => {
      await openCollection(page, 'icon-test');
    });

    await test.step('Open collection settings overview', async () => {
      await locators.sidebar.collection('icon-test').hover();
      await locators.actions.collectionActions('icon-test').click();
      await locators.dropdown.item('Settings').click();
      await expect(page.getByTestId('collection-settings-tab-overview')).toBeVisible();
    });

    await test.step('Select a lucide icon from the picker', async () => {
      await page.getByTestId('collection-icon-picker-trigger').click();
      await expect(page.getByTestId('icon-picker-modal')).toBeVisible();
      await page.getByTestId('icon-picker-search').fill('folder');
      await page.getByTestId('icon-picker-item-folder').click();
      await expect(page.getByTestId('icon-picker-modal')).toBeHidden();

      const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';
      await page.keyboard.press(saveShortcut);
    });

    await test.step('Wait for autosave and verify bruno.json contains the icon', async () => {
      await expect.poll(async () => {
        const content = await fs.promises.readFile(brunoJsonPath, 'utf-8');
        return JSON.parse(content).icon;
      }, { timeout: 10000 }).toEqual({
        source: 'lucide',
        name: 'folder'
      });
    });

    await test.step('Sidebar collection row renders a collection icon', async () => {
      const collectionRow = page.locator('#sidebar-collection-name', { hasText: 'icon-test' }).locator('..');
      await expect(collectionRow.locator('svg').first()).toBeVisible();
    });
  });
});
