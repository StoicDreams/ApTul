import { test, expect, openPage } from './support/site.mjs';
import { outputText, setNumber } from './support/tools.mjs';

test.beforeEach(async ({ page }) => {
    await openPage(page, '/password-generator');
});

const tool = page => page.locator('app-password-generator');
const setBox = (page, name, on) => tool(page).locator(`input[type=checkbox][name="${name}"]`).setChecked(on);
const passwords = async page => (await outputText(tool(page))).split('\n');

test('makes a 20 character password with every kind of character straight away', async ({ page }) => {
    await expect.poll(async () => (await passwords(page))[0].length).toBe(20);
    const [pw] = await passwords(page);
    expect(pw).toMatch(/[A-Z]/);
    expect(pw).toMatch(/[a-z]/);
    expect(pw).toMatch(/[0-9]/);
    expect(pw).toMatch(/[^A-Za-z0-9]/);
    await expect(tool(page).locator('webui-alert')).toContainText('bits of randomness');
});

test('uses only the chosen characters, and every chosen type appears', async ({ page }) => {
    await setBox(page, 'upper', false);
    await setBox(page, 'symbols', false);
    await setNumber(tool(page), 'How many', 30);
    await setNumber(tool(page), 'Length', 8);
    await expect.poll(async () => (await passwords(page)).length).toBe(30);
    for (const pw of await passwords(page)) {
        expect(pw).toMatch(/^[a-z0-9]{8}$/);
        expect(pw).toMatch(/[a-z]/);
        expect(pw).toMatch(/[0-9]/);
    }
});

test('leaves out look-alike characters when asked', async ({ page }) => {
    await setBox(page, 'ambiguous', true);
    await setNumber(tool(page), 'How many', 50);
    await setNumber(tool(page), 'Length', 64);
    await expect.poll(async () => (await passwords(page)).length).toBe(50);
    expect((await passwords(page)).join('')).not.toMatch(/[Il1O0o]/);
});

test('keeps length and count within limits, and needs at least one type', async ({ page }) => {
    await setNumber(tool(page), 'Length', 500);
    await expect.poll(async () => (await passwords(page))[0].length).toBe(128);
    for (const name of ['upper', 'lower', 'digits', 'symbols']) await setBox(page, name, false);
    await expect(tool(page).locator('webui-alert')).toContainText('Choose at least one');
    expect(await outputText(tool(page))).toBe('');
});

test('rates strength by bits of randomness', async ({ page }) => {
    await setNumber(tool(page), 'Length', 6);
    await expect(tool(page).locator('webui-alert')).toContainText('Weak');
    await setNumber(tool(page), 'Length', 24);
    await expect(tool(page).locator('webui-alert')).toContainText('Very strong');
});
