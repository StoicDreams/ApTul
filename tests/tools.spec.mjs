import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
    test, expect, openPage, ROOT_FILES, readJson, readText, routeToFile, navRoutes, sitemapUrls,
} from './support/site.mjs';

// The tools registry, the shared tool components, and the layout every tool page follows.
// See Docs/tool-page-template.md.

const registry = readJson(join(ROOT_FILES, 'tools.json'));
const toolUrls = registry.tools.map(tool => tool.url);

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

test.describe('tools registry', () => {
    test('every tool has a name, description, known category, and page', () => {
        const categories = registry.categories.map(category => category.id);
        for (const tool of registry.tools) {
            expect(tool.name, tool.url).toBeTruthy();
            expect(tool.description, tool.url).toBeTruthy();
            expect(categories, `${tool.url} category`).toContain(tool.category);
            expect(existsSync(routeToFile(tool.url)), `${tool.url} page file`).toBe(true);
        }
        expect(new Set(toolUrls).size, 'Each tool is listed once').toBe(toolUrls.length);
    });

    test('nav.json and sitemap.xml list the same tools as tools.json', () => {
        const nav = navRoutes().filter(route => route !== '/');
        const sitemap = sitemapUrls().map(url => new URL(url).pathname);
        expect(nav.filter(route => !toolUrls.includes(route)), 'In nav.json but not tools.json').toEqual([]);
        expect(toolUrls.filter(url => !nav.includes(url)), 'In tools.json but not nav.json').toEqual([]);
        expect(toolUrls.filter(url => !sitemap.includes(url)), 'In tools.json but not sitemap.xml').toEqual([]);
    });

    test('every tool page has an FAQ and related tools', () => {
        for (const url of toolUrls) {
            const page = readText(routeToFile(url));
            expect(page, `${url} FAQ`).toContain('## Frequently Asked Questions');
            expect(page, `${url} related tools`).toContain('<app-related-tools');
        }
    });
});

test.describe('app-related-tools', () => {
    test('lists other tools, starting with the same category', async ({ page }) => {
        await openPage(page, '/jwt-parser');
        const related = page.locator('app-related-tools');
        await expect(related.locator('h2')).toHaveText('Related Tools');
        const links = related.locator('webui-card');
        await expect(links).toHaveCount(Math.min(6, registry.tools.length - 1));
        const urls = await links.evaluateAll(cards => cards.map(card => card.getAttribute('link')));
        expect(urls).not.toContain('/jwt-parser');
        const sameCategory = registry.tools.filter(tool => tool.category === 'developer' && tool.url !== '/jwt-parser').map(tool => tool.url);
        // Tools in the same category come first, filling the list when there are more of them than fit.
        const first = urls.slice(0, Math.min(sameCategory.length, urls.length));
        expect(first.every(url => sameCategory.includes(url)), `${first} are all developer tools`).toBe(true);
    });

    test('limit and category change what is listed', async ({ page }) => {
        await openPage(page, '/');
        const root = await mount(page, '<app-related-tools category="image" limit="1" heading="Try This"></app-related-tools>');
        await expect(root.locator('h2')).toHaveText('Try This');
        const cards = root.locator('webui-card');
        await expect(cards).toHaveCount(1);
        const first = registry.tools.find(tool => tool.category === 'image');
        await expect(cards).toHaveAttribute('link', first.url);
    });
});

test.describe('app-tool-output', () => {
    test('shows the result and hides when empty', async ({ page }) => {
        await openPage(page, '/');
        const root = await mount(page, '<app-tool-output label="Result" lang="json" filename="result.json" mime="application/json"></app-tool-output>');
        const output = root.locator('app-tool-output');
        await expect(output).toBeHidden();
        await output.evaluate(el => el.setValue('{"a":1}'));
        await expect(output).toBeVisible();
        await expect(output.locator('webui-code')).toContainText('{"a":1}');
        await output.evaluate(el => el.setValue(''));
        await expect(output).toBeHidden();
    });

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
        await output.locator('webui-button', { hasText: 'Copy' }).click();
        await expect(output.locator('webui-button.copy')).toHaveText('Copied');
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(exact);
    });

    test('has no Download button without a filename', async ({ page }) => {
        await openPage(page, '/');
        const root = await mount(page, '<app-tool-output></app-tool-output>');
        const output = root.locator('app-tool-output');
        await output.evaluate(el => el.setValue('text'));
        await expect(output.locator('webui-button', { hasText: 'Download' })).toBeHidden();
    });
});

test.describe('app-file-drop', () => {
    test('reads dropped files in the same shape as webui-file-select', async ({ page }) => {
        await openPage(page, '/');
        const root = await mount(page, '<app-file-drop multiple accept=".txt,.json"><p>Tool</p></app-file-drop>');
        const drop = root.locator('app-file-drop');
        const changed = drop.evaluate(el => new Promise(resolve => el.addEventListener('change', () => resolve(el.value), { once: true })));
        await dropFiles(drop, [text('a.txt', 'text/plain', 'first'), text('b.json', 'application/json', '{"b":2}')]);
        const value = await changed;
        expect(value.map(file => [file.name, file.content])).toEqual([['a.txt', 'first'], ['b.json', '{"b":2}']]);
        expect(value[0]).toMatchObject({ type: 'text/plain', size: 5 });
    });

    test('skips files that do not match accept, and keeps one file without multiple', async ({ page }) => {
        await openPage(page, '/');
        const root = await mount(page, '<app-file-drop accept="image/*" read="dataurl"></app-file-drop>');
        const drop = root.locator('app-file-drop');
        const rejected = drop.evaluate(el => new Promise(resolve => el.addEventListener('rejected', () => resolve(true), { once: true })));
        await dropFiles(drop, [text('a.txt', 'text/plain', 'nope')]);
        expect(await rejected).toBe(true);
        const changed = drop.evaluate(el => new Promise(resolve => el.addEventListener('change', () => resolve(el.value), { once: true })));
        await dropFiles(drop, [PNG, { ...PNG, name: 'second.png' }]);
        const value = await changed;
        expect(value).toHaveLength(1);
        expect(value[0].content).toMatch(/^data:image\/png;base64,/);
    });

    test('shows the drop label while files are dragged over it', async ({ page }) => {
        await openPage(page, '/');
        const root = await mount(page, '<app-file-drop label="Drop it"><p>Tool</p></app-file-drop>');
        const drop = root.locator('app-file-drop');
        await drop.evaluate(el => {
            const transfer = new DataTransfer();
            transfer.items.add(new File(['x'], 'x.txt', { type: 'text/plain' }));
            el.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: transfer }));
        });
        await expect(drop).toHaveAttribute('dragging', '');
        await expect(drop.locator('.drop-label')).toHaveText('Drop it');
        await drop.evaluate(el => el.dispatchEvent(new DragEvent('dragleave', { bubbles: true })));
        await expect(drop).not.toHaveAttribute('dragging', '');
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

test.describe('app-tool-directory', () => {
    test('the home page lists every tool as a plain link, for the static page search engines read', () => {
        const home = readText(routeToFile('/'));
        const block = home.match(/<app-tool-directory>([\s\S]*?)<\/app-tool-directory>/)?.[1];
        expect(block, 'root.md should have an app-tool-directory with a list of tool links inside').toBeTruthy();
        const listed = [...block.matchAll(/\]\((\/[^)\s]*)\)/g)].map(match => match[1]);
        expect(listed.filter(url => !toolUrls.includes(url)), 'Listed on the home page but not in tools.json').toEqual([]);
        expect(toolUrls.filter(url => !listed.includes(url)), 'In tools.json but not listed on the home page').toEqual([]);
    });

    test('groups tools by category, skipping empty categories', async ({ page }) => {
        await openPage(page, '/');
        const directory = page.locator('app-tool-directory');
        await expect(directory.locator('webui-card')).toHaveCount(registry.tools.length);
        const used = registry.categories.filter(category => registry.tools.some(tool => tool.category === category.id));
        await expect(directory.locator('section > h2')).toHaveText(used.map(category => category.name));
        // The plain list is replaced once the directory loads.
        await expect(directory.locator('ul')).toHaveCount(0);
    });

    test('search filters tools and categories, and clearing it shows everything again', async ({ page }) => {
        await openPage(page, '/');
        const directory = page.locator('app-tool-directory');
        const search = directory.locator('webui-input-text input');
        const visibleCards = directory.locator('webui-card:visible');
        await search.fill('jwt');
        await expect(visibleCards).toHaveCount(1);
        await expect(visibleCards).toHaveAttribute('link', '/jwt-parser');
        await expect(directory.locator('section[data-category="image"]')).toBeHidden();
        await search.fill('favicon ico');
        await expect(visibleCards).toHaveCount(1);
        await expect(visibleCards).toHaveAttribute('link', '/favicon-generator');
        await search.fill('nothing matches this');
        await expect(visibleCards).toHaveCount(0);
        await expect(directory.locator('.no-results')).toBeVisible();
        await search.fill('');
        await expect(visibleCards).toHaveCount(registry.tools.length);
        await expect(directory.locator('.no-results')).toBeHidden();
    });
});
