import { expect, test } from '@playwright/test';

test('collection scale resource budget', async ({ page }) => {
  const samples: Array<{
    total: number;
    visible: number;
    canvasWidth: number;
    canvasHeight: number;
  }> = [];
  for (const total of [20, 50, 100]) {
    await page.goto(`/?items=${total}`);
    const viewport = page.getByTestId('scale-viewport');
    await viewport.scrollIntoViewIfNeeded();
    const stats = page.getByTestId('scale-stats');
    await expect(stats).toHaveText(new RegExp(`^[1-9]\\d* of ${total} 3D icons mounted`));
    for (const ratio of [0, 0.5, 1]) {
      await viewport.evaluate((element, value) => {
        element.scrollTop = (element.scrollHeight - element.clientHeight) * value;
      }, ratio);
      await page.waitForTimeout(100);
      const text = await stats.textContent();
      const match = text?.match(new RegExp(`(\\d+) of ${total}.*· (\\d+)×(\\d+) canvas`));
      if (!match) throw new Error(`Unexpected scale stats: ${text}`);
      samples.push({
        total,
        visible: Number(match[1]),
        canvasWidth: Number(match[2]),
        canvasHeight: Number(match[3])
      });
    }
  }

  expect(new Set(samples.map((sample) => sample.total))).toEqual(new Set([20, 50, 100]));
  expect(Math.max(...samples.map((sample) => sample.visible))).toBeLessThan(20);
  expect(Math.max(...samples.map((sample) => sample.canvasHeight))).toBeLessThanOrEqual(620);
});
