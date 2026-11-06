import { test, expect, openPage } from './support/site.mjs';
import { codeText } from './support/tools.mjs';

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

test('gives the data URL, Base64, HTML, and CSS for an image', async ({ page }) => {
    await drop(page, 'my-icon.png', 'image/png', PNG);
    const dataUrl = `data:image/png;base64,${PNG}`;
    await expect.poll(() => codeText(tool(page), 'Data URL')).toBe(dataUrl);
    expect(await codeText(tool(page), 'Base64 only')).toBe(PNG);
    expect(await codeText(tool(page), 'HTML image tag')).toBe(`<img src="${dataUrl}" alt="my icon">`);
    expect(await codeText(tool(page), 'CSS background')).toBe(`background-image: url("${dataUrl}");`);
    await expect(tool(page).locator('img.image-preview')).toBeVisible();
    await expect(tool(page).locator('webui-alert')).toContainText('my-icon.png');
});

test('shows a file name with HTML in it as text, and escapes it in the snippet', async ({ page }) => {
    await drop(page, '"><img src=x onerror="window.__attacked=1">.png', 'image/png', PNG);
    // Quotes are escaped so the name cannot end the attribute. The alt text also turns _ and - into spaces.
    await expect.poll(() => codeText(tool(page), 'HTML image tag')).toContain('alt="&quot;><img src=x onerror=&quot;window. attacked=1&quot;>"');
    await expect(tool(page).locator('webui-alert img, webui-code img')).toHaveCount(0);
    expect(await page.evaluate(() => window.__attacked)).toBeUndefined();
});

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
