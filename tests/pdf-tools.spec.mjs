import { test, expect, openPage } from './support/site.mjs';
import { makePdf, makePng, dropFiles, pageCount, download } from './support/pdf.mjs';
import { choose } from './support/tools.mjs';

const pdf = (name, labels, sizes) => ({ name, type: 'application/pdf', bytes: makePdf(labels, sizes) });
const notes = tool => tool.locator('.file-row .file-note').allInnerTexts();
const names = tool => tool.locator('.file-row .file-name').allInnerTexts();

// A wide image, so A4 and Letter pages turn sideways.
const PNG = await makePng(40, 20);

test.describe('Merge PDF', () => {
    const tool = page => page.locator('app-pdf-merge');
    test.beforeEach(async ({ page }) => openPage(page, '/merge-pdf'));

    test('shows page counts, then merges files in the chosen order', async ({ page }) => {
        await dropFiles(tool(page), [pdf('first.pdf', ['a1', 'a2']), pdf('second.pdf', ['b1', 'b2', 'b3'])]);
        await expect.poll(() => notes(tool(page))).toEqual(['2 pages', '3 pages']);

        // Spy on what is sent to the worker, to check the order the files are merged in.
        await page.evaluate(() => {
            const real = webui.worker;
            window.__merged = [];
            webui.worker = new Proxy({}, { get: (_, name) => (...args) => {
                if (name === 'merge_pdfs') window.__merged.push([...args[1]]);
                return real[name](...args);
            } });
        });
        await tool(page).locator('.file-row').first().locator('button.move-down').click();
        expect(await names(tool(page))).toEqual(['second.pdf', 'first.pdf']);
        await expect.poll(() => notes(tool(page))).toEqual(['3 pages', '2 pages']);

        const file = await download(page, () => tool(page).locator('webui-button.merge').click());
        expect(file.name).toBe('merged.pdf');
        expect(await pageCount(page, file.bytes)).toBe(5);
        const sizes = [makePdf(['b1', 'b2', 'b3']).length, makePdf(['a1', 'a2']).length];
        expect(await page.evaluate(() => window.__merged)).toEqual([sizes]);
        await expect(tool(page).locator('webui-alert')).toContainText('5 pages');
    });

    test('needs two files, and reports files it cannot use', async ({ page }) => {
        await dropFiles(tool(page), [pdf('only.pdf', ['a'])]);
        await expect(tool(page).locator('webui-alert')).toContainText('at least one more');
        await dropFiles(tool(page), [{ name: 'broken.pdf', type: 'application/pdf', bytes: Buffer.from('not a pdf') }]);
        await expect.poll(() => notes(tool(page))).toEqual(['1 page', 'Cannot be read']);
        await expect(tool(page).locator('webui-alert')).toContainText('broken.pdf');
        await dropFiles(tool(page), [{ name: 'notes.txt', type: 'text/plain', bytes: Buffer.from('hi') }]);
        await expect(tool(page).locator('webui-alert')).toContainText('not PDFs: notes.txt');
        expect(await names(tool(page))).toEqual(['only.pdf', 'broken.pdf']);
        await tool(page).locator('.file-row').nth(1).locator('button.remove').click();
        expect(await names(tool(page))).toEqual(['only.pdf']);
    });
});

test.describe('Split PDF', () => {
    const tool = page => page.locator('app-pdf-split');
    const pages = page => tool(page).locator('webui-input-message[label="Pages"] textarea');
    test.beforeEach(async ({ page }) => {
        await openPage(page, '/split-pdf');
        await dropFiles(tool(page), [pdf('report.pdf', ['1', '2', '3', '4', '5'])]);
        await expect(tool(page).locator('webui-alert')).toContainText('report.pdf has 5 pages');
    });

    test('extracts chosen pages into one PDF', async ({ page }) => {
        await pages(page).fill('2-3, 5');
        const file = await download(page, () => tool(page).locator('webui-button.run').click());
        expect(file.name).toBe('report-pages.pdf');
        expect(await pageCount(page, file.bytes)).toBe(3);
    });

    test('splits by range, with open ended ranges', async ({ page }) => {
        await choose(tool(page), 'What to Do', 'ranges');
        await pages(page).fill('1-2, 4-');
        await tool(page).locator('webui-button.run').click();
        const results = tool(page).locator('webui-button.result');
        await expect(results).toHaveCount(2);
        expect(await results.evaluateAll(b => b.map(x => x.dataset.filename))).toEqual(['report-pages-1-2.pdf', 'report-pages-4-5.pdf']);
        const file = await download(page, () => results.nth(1).click());
        expect(await pageCount(page, file.bytes)).toBe(2);
    });

    test('splits every page into its own file', async ({ page }) => {
        await choose(tool(page), 'What to Do', 'every');
        await expect(pages(page)).toBeHidden();
        await tool(page).locator('webui-button.run').click();
        await expect(tool(page).locator('webui-button.result')).toHaveCount(5);
        await expect(tool(page).locator('webui-button.result').first()).toContainText('report-page-1.pdf (1 page)');
    });

    test('explains page ranges it cannot use', async ({ page }) => {
        const status = tool(page).locator('webui-alert');
        for (const [range, message] of [['2-9', 'past the last page'], ['4-2', 'ends before it starts'], ['two', 'is not a page'], ['', 'Enter the pages']]) {
            await pages(page).fill(range);
            await tool(page).locator('webui-button.run').click();
            await expect(status).toContainText(message);
        }
    });
});

test.describe('Image to PDF', () => {
    const tool = page => page.locator('app-image-to-pdf');
    test.beforeEach(async ({ page }) => openPage(page, '/image-to-pdf'));

    test('puts each image on its own page', async ({ page }) => {
        await dropFiles(tool(page), [
            { name: 'one.png', type: 'image/png', bytes: PNG },
            { name: 'two.png', type: 'image/png', bytes: PNG },
        ]);
        await expect(tool(page).locator('.file-row')).toHaveCount(2);
        const file = await download(page, () => tool(page).locator('webui-button.create').click());
        expect(file.name).toBe('images.pdf');
        expect(await pageCount(page, file.bytes)).toBe(2);
        // A4 turned sideways for the wide image.
        expect(file.bytes.toString('latin1')).toMatch(/\/MediaBox\s*\[0 0 841.89 595.28\]/);
    });

    test('names a single image PDF after the image, and uses the page size chosen', async ({ page }) => {
        await dropFiles(tool(page), [{ name: 'receipt.png', type: 'image/png', bytes: PNG }]);
        await choose(tool(page), 'Page Size', 'letter');
        const file = await download(page, () => tool(page).locator('webui-button.create').click());
        expect(file.name).toBe('receipt.pdf');
        expect(file.bytes.toString('latin1')).toMatch(/\/MediaBox\s*\[0 0 792(\.0)? 612(\.0)?\]/);
    });

    test('reports files that are not images it can use', async ({ page }) => {
        await dropFiles(tool(page), [{ name: 'photo.gif', type: 'image/gif', bytes: Buffer.from('GIF89a') }]);
        await expect(tool(page).locator('webui-alert')).toContainText('not supported images: photo.gif');
        await dropFiles(tool(page), [{ name: 'fake.png', type: 'image/png', bytes: Buffer.from('nope') }]);
        await tool(page).locator('webui-button.create').click();
        await expect(tool(page).locator('webui-alert')).toContainText('fake.png is not an image');
    });
});
