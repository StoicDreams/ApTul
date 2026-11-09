import { test, expect, openPage, readJson, ROOT_FILES } from './support/site.mjs';
import { join } from 'node:path';

// Uses the Rust worker, so webapp/pkg must exist (run PowerShell/RunLocal.ps1 -PreBuildOnly or a Trunk build first).

const tool = page => page.locator('app-image-converter');
const choose = (page, label, value) => tool(page).locator(`webui-dropdown[label="${label}"] select`).selectOption(value, { force: true });

/** Make an image in the page with a canvas, returned as Base64. */
async function makeImage(page, { type, width, height, draw, quality }) {
    return page.evaluate(({ type, width, height, draw, quality }) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        new Function('ctx', 'w', 'h', draw)(canvas.getContext('2d'), width, height);
        return canvas.toDataURL(type, quality).split(',')[1];
    }, { type, width, height, draw, quality });
}

const NOISY_PHOTO = `
    const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#3a7'); g.addColorStop(1, '#a73');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h);
    let seed = 1;
    for (let i = 0; i < d.data.length; i += 4) { seed = (seed * 16807) % 2147483647; const n = (seed / 2147483647 - 0.5) * 30; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; }
    ctx.putImageData(d, 0, 0);`;

async function dropImage(page, base64, name, type) {
    await tool(page).locator('app-file-drop').evaluate((el, { base64, name, type }) => {
        const transfer = new DataTransfer();
        transfer.items.add(new File([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], name, { type }));
        for (const event of ['dragenter', 'dragover', 'drop']) {
            el.dispatchEvent(new DragEvent(event, { bubbles: true, cancelable: true, dataTransfer: transfer }));
        }
    }, { base64, name, type });
}

/** Wait for a conversion to a format, then return its size in bytes, note, and data URL. */
async function converted(page, format) {
    await expect.poll(() => tool(page).evaluate(el => el._converted?.format)).toBe(format);
    return tool(page).evaluate(el => ({
        bytes: atob(el._converted.content.split(',')[1]).length,
        note: el._note.innerText,
        content: el._converted.content,
        size: el._msgConvert.innerText.replace(/\s+/g, ' '),
    }));
}

/** The color of one pixel of the converted image. */
async function pixel(page, x, y) {
    return tool(page).evaluate(async (el, { x, y }) => {
        const img = new Image();
        img.src = el._converted.content;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return [...ctx.getImageData(x, y, 1, 1).data];
    }, { x, y });
}

test.beforeEach(async ({ page }) => {
    await openPage(page, '/image-converter');
});

test('JPG to WebP makes a smaller file, and lower quality makes it smaller still', async ({ page }) => {
    const jpg = await makeImage(page, { type: 'image/jpeg', width: 400, height: 300, draw: NOISY_PHOTO, quality: 0.85 });
    await dropImage(page, jpg, 'photo.jpg', 'image/jpeg');
    const good = await converted(page, 'webp');
    expect(good.bytes).toBeLessThan(atob(jpg).length);
    expect(good.content).toMatch(/^data:image\/webp;/);
    await choose(page, 'Quality', '0.5');
    await expect.poll(async () => (await converted(page, 'webp')).bytes).toBeLessThan(good.bytes);
});

test('PNG to JPG fills transparent areas with white, and says so', async ({ page }) => {
    const png = await makeImage(page, { type: 'image/png', width: 100, height: 60, draw: `ctx.fillStyle = '#f00'; ctx.fillRect(40, 20, 20, 20);` });
    await dropImage(page, png, 'logo.png', 'image/png');
    await choose(page, 'Convert To', 'jpg');
    const result = await converted(page, 'jpg');
    expect(result.note).toContain('see-through areas are now white');
    const [r, g, b] = await pixel(page, 2, 2);
    expect(Math.min(r, g, b)).toBeGreaterThan(245);
});

test('ICO images are scaled to fit 256 pixels, with a note', async ({ page }) => {
    const png = await makeImage(page, { type: 'image/png', width: 400, height: 300, draw: `ctx.fillStyle = '#08f'; ctx.fillRect(0, 0, w, h);` });
    await dropImage(page, png, 'logo.png', 'image/png');
    await choose(page, 'Convert To', 'ico');
    const result = await converted(page, 'ico');
    expect(result.size).toContain('Dimensions: 256 x 192');
    expect(result.note).toContain('at most 256 pixels');
});

test('"Same as original" keeps the format, and Quality only shows for JPG and WebP', async ({ page }) => {
    const png = await makeImage(page, { type: 'image/png', width: 50, height: 50, draw: `ctx.fillStyle = '#0a0'; ctx.fillRect(0, 0, w, h);` });
    await dropImage(page, png, 'leaf.png', 'image/png');
    await choose(page, 'Convert To', 'same');
    await converted(page, 'png');
    await expect(tool(page).locator('webui-dropdown[label="Quality"]')).toBeHidden();
    await choose(page, 'Convert To', 'jpg');
    await expect(tool(page).locator('webui-dropdown[label="Quality"]')).toBeVisible();
});

test('downloads the result named after the original file', async ({ page }) => {
    const png = await makeImage(page, { type: 'image/png', width: 20, height: 20, draw: `ctx.fillStyle = '#00f'; ctx.fillRect(0, 0, w, h);` });
    await dropImage(page, png, 'my.photo.png', 'image/png');
    await converted(page, 'webp');
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        tool(page).locator('webui-button.download').click(),
    ]);
    expect(download.suggestedFilename()).toBe('my.photo.webp');
});

test('turns phone photos upright using their EXIF orientation, instead of squashing them', async ({ page }) => {
    // 40 x 20: left half red, right half blue.
    const plain = await makeImage(page, { type: 'image/jpeg', width: 40, height: 20, quality: 1, draw: `ctx.fillStyle = '#f00'; ctx.fillRect(0, 0, 20, 20); ctx.fillStyle = '#00f'; ctx.fillRect(20, 0, 20, 20);` });
    // Insert an EXIF block saying "rotate 90 degrees clockwise to view", as phones do (orientation 6).
    const bytes = [...Buffer.from(plain, 'base64')];
    const tiff = [0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    const payload = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff];
    const app1 = [0xff, 0xe1, (payload.length + 2) >> 8, (payload.length + 2) & 0xff, ...payload];
    const rotated = Buffer.from([...bytes.slice(0, 2), ...app1, ...bytes.slice(2)]).toString('base64');
    await dropImage(page, rotated, 'phone.jpg', 'image/jpeg');
    await choose(page, 'Convert To', 'png');
    const result = await converted(page, 'png');
    // Upright, the image is 20 x 40 with red on top. Squashed, the top right would be blue.
    expect(result.size).toContain('Dimensions: 20 x 40');
    const [r, , b] = await pixel(page, 15, 5);
    expect(r).toBeGreaterThan(200);
    expect(b).toBeLessThan(80);
});

test.describe('format pages start with their format chosen', () => {
    const pages = { '/png-to-webp': 'webp', '/jpg-to-webp': 'webp', '/webp-to-png': 'png', '/webp-to-jpg': 'jpg', '/png-to-jpg': 'jpg', '/jpg-to-png': 'png', '/favicon-generator': 'ico', '/resize-image': 'same', '/remove-exif': 'same' };
    const registered = readJson(join(ROOT_FILES, 'tools.json')).tools.map(t => t.url);
    for (const [url, format] of Object.entries(pages)) {
        test(url, async ({ page }) => {
            expect(registered).toContain(url);
            await openPage(page, url);
            await expect.poll(() => tool(page).locator('webui-dropdown[label="Convert To"] select').inputValue()).toBe(format);
        });
    }
});
