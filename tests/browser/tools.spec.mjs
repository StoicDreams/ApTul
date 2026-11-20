import { join } from 'node:path';
import { test, expect, openPage, pageReady, ROOT_FILES, readJson } from '../support/site.mjs';

// The tools registry, the shared tool components, and the layout every tool page follows.
// See Docs/tool-page-template.md.

const registry = readJson(join(ROOT_FILES, 'tools.json'));

/**
 * Resolves with true once the element's text becomes `text`. Start it before the click: a label such as "Copied" only
 * shows for a moment, and a check after the click can miss it on a slow machine.
 */
function textBecomes(locator, text) {
    return locator.evaluate((el, text) => new Promise(resolve => {
        const observer = new MutationObserver(() => {
            if (el.innerText.trim() === text) {
                observer.disconnect();
                resolve(true);
            }
        });
        observer.observe(el, { childList: true, characterData: true, subtree: true });
    }), text);
}

/** Put HTML at the top of the page content, where a tool would be, and wait for its components to load. */
async function mount(page, html) {
    const tags = [...new Set((html.match(/<(webui|app)-[a-z0-9-]+/g) || []).map(tag => tag.substring(1)))];
    await page.evaluate(async ({ html, tags }) => {
        const root = document.createElement('div');
        root.id = 'test-root';
        root.innerHTML = html;
        // Outside webui-app the content sits underneath the app, where it cannot be clicked.
        const app = document.querySelector('webui-app');
        app.insertBefore(root, app.querySelector(':scope > :not([slot])'));
        await Promise.all(tags.map(tag => customElements.whenDefined(tag)));
    }, { html, tags });
    // The components inside them load their own scripts, so wait for those too.
    await pageReady(page);
    return page.locator('#test-root');
}

/** Drop files on an element, the same way the browser does when files are dragged from the desktop. */
async function dropFiles(locator, files) {
    await locator.evaluate(async (el, files) => {
        const transfer = new DataTransfer();
        for (const file of files) {
            const bytes = Uint8Array.from(atob(file.base64), c => c.charCodeAt(0));
            transfer.items.add(new File([bytes], file.name, { type: file.type }));
        }
        for (const type of ['dragenter', 'dragover', 'drop']) {
            el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer }));
        }
    }, files);
}

const text = (name, type, value) => ({ name, type, base64: Buffer.from(value).toString('base64') });
// A 1x1 PNG.
const PNG = { name: 'pixel.png', type: 'image/png', base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==' };

test.describe('app-tool-output', () => {

    test('downloads the result with its filename', async ({ page }) => {
        await openPage(page, '/');
        const root = await mount(page, '<app-tool-output filename="result.txt"></app-tool-output>');
        const output = root.locator('app-tool-output');
        await output.evaluate(el => el.setValue('hello world'));
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            output.locator('webui-button', { hasText: 'Download' }).click(),
        ]);
        expect(download.suggestedFilename()).toBe('result.txt');
        const stream = await download.createReadStream();
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        expect(Buffer.concat(chunks).toString()).toBe('hello world');
    });

    test('copies the exact result, including tabs and surrounding spaces', async ({ page, context }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        await openPage(page, '/');
        const root = await mount(page, '<app-tool-output label="Result"></app-tool-output>');
        const output = root.locator('app-tool-output');
        const exact = '{\n\t"a": "x & y <b>"\n}\n';
        await output.evaluate((el, text) => el.setValue(text), exact);
        const copied = textBecomes(output.locator('webui-button.copy'), 'Copied');
        await output.locator('webui-button', { hasText: 'Copy' }).click();
        expect(await copied).toBe(true);
        await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(exact);
    });

});

test.describe('image converter', () => {
    test('loads an image dropped on the tool', async ({ page }) => {
        await openPage(page, '/image-converter');
        const converter = page.locator('app-image-converter');
        await dropFiles(converter.locator('app-file-drop'), [PNG]);
        await expect(converter.locator('webui-flex.msgSelected')).toContainText('Dimensions: 1 x 1');
    });
});

