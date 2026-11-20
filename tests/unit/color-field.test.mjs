import { test, expect, openPage } from './support/site.mjs';
import { typeInto } from '../helpers/tools.mjs';

// app-color-field, tested inside the Color Converter, which uses one.
test.beforeEach(async ({ page }) => {
    await openPage(page, '/color-converter');
});

const field = page => page.locator('app-color-field');

test('marks text that is not a color, and names the picker for screen readers', async ({ page }) => {
    await typeInto(page, 'Color', 'not a color');
    await expect(field(page)).toHaveAttribute('invalid', '');
    await expect.poll(() => field(page).evaluate(el => el.color)).toBeNull();
    await expect(field(page).getByLabel('Pick the color')).toHaveAttribute('type', 'color');
});
