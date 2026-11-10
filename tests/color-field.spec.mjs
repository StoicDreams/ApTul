import { test, expect, openPage } from './support/site.mjs';
import { typeInto } from './support/tools.mjs';

// app-color-field, tested inside the Color Converter, which uses one.
test.beforeEach(async ({ page }) => {
    await openPage(page, '/color-converter');
});

const field = page => page.locator('app-color-field');
const fill = page => field(page).locator('.fill');

test('starts with its value attribute, shown in the box and the swatch', async ({ page }) => {
    await expect(field(page).locator('textarea')).toHaveValue('#ff8800');
    await expect(fill(page)).toHaveCSS('background-color', 'rgb(255, 136, 0)');
    await expect.poll(() => field(page).evaluate(el => el.color)).toEqual({ r: 255, g: 136, b: 0, a: 1 });
});

test('reads typed colors into color, the swatch, and the picker, and sends one input event', async ({ page }) => {
    await field(page).evaluate(el => {
        window.fieldEvents = 0;
        el.addEventListener('input', () => window.fieldEvents++);
    });
    await typeInto(page, 'Color', 'rebeccapurple');
    await expect(fill(page)).toHaveCSS('background-color', 'rgb(102, 51, 153)');
    await expect(field(page).locator('input[type=color]')).toHaveValue('#663399');
    expect(await field(page).evaluate(el => el.value)).toBe('rebeccapurple');
    expect(await page.evaluate(() => window.fieldEvents)).toBe(1);
});

test('shows see-through colors over a checkerboard', async ({ page }) => {
    await typeInto(page, 'Color', 'rgba(255, 0, 0, 0.5)');
    await expect(fill(page)).toHaveCSS('background-color', /rgba\(255, 0, 0, 0\.5/);
});

test('a picked color replaces the text', async ({ page }) => {
    await field(page).locator('input[type=color]').fill('#123456');
    await expect(field(page).locator('textarea')).toHaveValue('#123456');
    await expect.poll(() => field(page).evaluate(el => el.color)).toEqual({ r: 18, g: 52, b: 86, a: 1 });
});

test('marks text that is not a color, and names the picker for screen readers', async ({ page }) => {
    await typeInto(page, 'Color', 'not a color');
    await expect(field(page)).toHaveAttribute('invalid', '');
    expect(await field(page).evaluate(el => el.color)).toBeNull();
    await expect(field(page).getByLabel('Pick the color')).toHaveAttribute('type', 'color');
});
