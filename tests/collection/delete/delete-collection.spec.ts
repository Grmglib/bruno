import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import {
  createCollection,
  createRequest,
  deleteCollectionFromOverview,
  removeCollectionFromOverview
} from '../../utils/page';

test.describe('Delete collection', () => {
  test('Delete collection from workspace overview removes files from disk', async ({ page, createTmpDir }) => {
    const collectionName = 'delete-test-collection';
    const tmpDir = await createTmpDir(collectionName);
    const collectionPath = path.join(tmpDir, collectionName);

    await createCollection(page, collectionName, tmpDir);
    await createRequest(page, 'ping', collectionName, { url: 'http://localhost:8081/ping' });

    expect(fs.existsSync(collectionPath)).toBe(true);

    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));

    await deleteCollectionFromOverview(page, collectionName);

    await expect(
      page.locator('.collection-card').filter({ hasText: collectionName })
    ).not.toBeVisible();

    await expect(
      page.locator('#sidebar-collection-name').filter({ hasText: collectionName })
    ).not.toBeVisible();

    expect(fs.existsSync(collectionPath)).toBe(false);
    expect(pageErrors).toHaveLength(0);
  });

  test('Remove collection from workspace overview keeps files on disk', async ({ page, createTmpDir }) => {
    const collectionName = 'remove-only-test-collection';
    const tmpDir = await createTmpDir(collectionName);
    const collectionPath = path.join(tmpDir, collectionName);

    await createCollection(page, collectionName, tmpDir);
    await createRequest(page, 'ping', collectionName, { url: 'http://localhost:8081/ping' });

    expect(fs.existsSync(collectionPath)).toBe(true);

    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));

    await removeCollectionFromOverview(page, collectionName);

    await expect(
      page.locator('.collection-card').filter({ hasText: collectionName })
    ).not.toBeVisible();

    await expect(
      page.locator('#sidebar-collection-name').filter({ hasText: collectionName })
    ).not.toBeVisible();

    expect(fs.existsSync(collectionPath)).toBe(true);
    expect(pageErrors).toHaveLength(0);
  });
});
