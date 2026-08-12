import { expect, test } from '@playwright/test';

test('demo renders and remains usable on a narrow viewport', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /give your icon/i })).toBeVisible();
  const canvas = page.locator('.stage canvas');
  await expect(canvas).toBeVisible();
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

  await expect(page.locator('[data-app-icon-canvas] canvas')).toHaveCount(2);
  await expect(collection.locator('[data-app-icon-id]')).toHaveCount(50);
  await expect(page.getByTestId('grid-stats')).toContainText('of 50 mounted');
  await expect(page.locator('[data-app-icon-canvas] canvas').first()).toBeVisible();

  const orbitCard = page.getByRole('button', { name: 'Select orbit', exact: true });
  await orbitCard.click();
  await expect(page.getByText('Selected orbit', { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 740 });
  await expect(page.locator('[data-app-icon-canvas] canvas')).toHaveCount(2);
  await expect(collection.locator('[data-app-icon-id]')).toHaveCount(50);
});

test('100-item list keeps the canvas and mounted icon set bounded', async ({ page }) => {
  await page.goto('/');
  const viewport = page.getByTestId('scale-viewport');
  await viewport.scrollIntoViewIfNeeded();
  const mountedSlots = page.getByTestId('scale-list').locator('[data-app-icon-id]');
  await expect(mountedSlots).toHaveCount(10);
  await expect(page.getByTestId('scale-stats')).toHaveText(
    /^[1-9]\d* of 100 3D icons mounted/
  );

  const initial = await page.getByTestId('scale-stats').textContent();
  const visible = Number(initial?.match(/^(\d+)/)?.[1]);
  expect(visible).toBeGreaterThan(0);
  expect(visible).toBeLessThan(20);

  const canvas = page.locator('[data-app-icon-canvas] canvas').last();
  const bounds = await canvas.boundingBox();
  const viewportBounds = await viewport.boundingBox();
  expect(bounds?.height).toBeLessThanOrEqual((viewportBounds?.height ?? 0) + 2);

  await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(page.getByTestId('scale-stats')).toContainText('of 100 3D icons mounted');
});
