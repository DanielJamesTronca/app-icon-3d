import { expect, test } from '@playwright/test';

test('demo renders and remains usable on a narrow viewport', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /app icons/i })).toBeVisible();
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await expect(page.getByText('Ready — drag to explore')).toBeVisible();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Canvas did not expose a bounding box.');
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 60, bounds.y + bounds.height / 2 - 20);
  await page.mouse.up();
  await page.getByRole('button', { name: 'glass' }).click();
  await page.setViewportSize({ width: 390, height: 740 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByRole('heading', { name: /portable by default/i })).toBeVisible();
});
