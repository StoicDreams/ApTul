import { test, expect, openPage } from '../support/site.mjs';

test.beforeEach(async ({ page }) => {
    await openPage(page, '/image-to-base64');
});

const tool = page => page.locator('app-image-to-base64');
// A 1x1 PNG.
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==';

async function drop(page, name, type, base64) {
    await tool(page).locator('app-file-drop').evaluate((el, { name, type, base64 }) => {
        const transfer = new DataTransfer();
        transfer.items.add(new File([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], name, { type }));
        for (const event of ['dragenter', 'dragover', 'drop']) {
            el.dispatchEvent(new DragEvent(event, { bubbles: true, cancelable: true, dataTransfer: transfer }));
        }
    }, { name, type, base64 });
}

test('warns about large data URLs', async ({ page }) => {
    const big = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 300;
        const ctx = canvas.getContext('2d');
        const data = ctx.createImageData(300, 300);
        // Random pixels do not compress, so the PNG is large.
        for (let i = 0; i < data.data.length; i += 65536) crypto.getRandomValues(data.data.subarray(i, i + 65536));
        for (let i = 3; i < data.data.length; i += 4) data.data[i] = 255;
        ctx.putImageData(data, 0, 0);
        return canvas.toDataURL('image/png').split(',')[1];
    });
    await drop(page, 'noise.png', 'image/png', big);
    await expect(tool(page).locator('webui-alert')).toContainText('A normal image file is usually better');
});

