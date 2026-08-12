import { expect, test } from '@playwright/test';

test('demo renders and remains usable on a narrow viewport', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /give your icon/i })).toBeVisible();
  const canvas = page.locator('.stage canvas');
  await expect(canvas).toBeVisible();
  await expect(page.getByText('Drag to explore')).toBeVisible();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Canvas did not expose a bounding box.');
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 60, bounds.y + bounds.height / 2 - 20);
  await page.mouse.up();
  await page.getByRole('button', { name: 'glass', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 740 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByRole('heading', { name: /take it anywhere/i })).toBeVisible();
});

test('collection renders several icons through one shared canvas', async ({ page }) => {
  await page.goto('/');
  const collection = page.getByTestId('icon-collection');
  await collection.scrollIntoViewIfNeeded();

  await expect(page.locator('[data-app-icon-canvas] canvas')).toHaveCount(1);
  await expect(collection.locator('[data-app-icon-id]')).toHaveCount(4);
  await expect(collection.locator('.collection-fallback').first()).toHaveCSS('opacity', '0');

  const orbitCard = page.getByRole('button', { name: 'Select orbit', exact: true });
  await orbitCard.click();
  await expect(page.getByText('Selected orbit', { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 740 });
  await expect(page.locator('[data-app-icon-canvas] canvas')).toHaveCount(1);
  await expect(collection.locator('[data-app-icon-id]')).toHaveCount(4);
});
