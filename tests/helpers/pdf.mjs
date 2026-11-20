// Small, valid PDFs for testing the PDF tools, built by hand so the tests need no PDF library.

/**
 * A PDF with one page per label. Each page shows its label, and pages can have their own sizes.
 * @param {string[]} labels
 * @param {[number, number][]} [sizes] page sizes in points, defaulting to US Letter
 */
export function makePdf(labels, sizes = []) {
    const objects = [];
    const add = body => objects.push(body) && objects.length;
    const catalog = add(null);
    const pages = add(null);
    const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const kids = labels.map((label, i) => {
        const [w, h] = sizes[i] || [612, 792];
        const text = `BT /F1 24 Tf 72 ${h - 100} Td (${label.replace(/[()\\]/g, '\\$&')}) Tj ET`;
        const content = add(`<< /Length ${text.length} >>\nstream\n${text}\nendstream`);
        return add(`<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${w} ${h}] /Contents ${content} 0 R /Resources << /Font << /F1 ${font} 0 R >> >> >>`);
    });
    objects[catalog - 1] = `<< /Type /Catalog /Pages ${pages} 0 R >>`;
    objects[pages - 1] = `<< /Type /Pages /Kids [${kids.map(k => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
    let out = '%PDF-1.4\n';
    const offsets = objects.map((body, i) => {
        const offset = out.length;
        out += `${i + 1} 0 obj\n${body}\nendobj\n`;
        return offset;
    });
    const xref = out.length;
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
    out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(out, 'latin1');
}

/** Drop files, given as { name, type, bytes }, on the app-file-drop inside a tool. */
export async function dropFiles(tool, files) {
    await tool.locator('app-file-drop').first().evaluate((el, files) => {
        const transfer = new DataTransfer();
        for (const f of files) transfer.items.add(new File([new Uint8Array(f.bytes)], f.name, { type: f.type }));
        for (const event of ['dragenter', 'dragover', 'drop']) {
            el.dispatchEvent(new DragEvent(event, { bubbles: true, cancelable: true, dataTransfer: transfer }));
        }
    }, files.map(f => ({ name: f.name, type: f.type, bytes: [...f.bytes] })));
}

/** Count pages in PDF bytes with the site's own worker. */
export async function pageCount(page, bytes) {
    return page.evaluate(b => webui.worker.pdf_page_count(new Uint8Array(b)), [...bytes]);
}

/** Wait for the download started by an action, and return its name and bytes. */
export async function download(page, action) {
    const [file] = await Promise.all([page.waitForEvent('download'), action()]);
    const { readFileSync } = await import('node:fs');
    return { name: file.suggestedFilename(), bytes: readFileSync(await file.path()) };
}

/** A valid solid red PNG of the given size, built with zlib. */
export async function makePng(width, height) {
    const { deflateSync, crc32 } = await import('node:zlib');
    const chunk = (type, data) => {
        const length = Buffer.alloc(4);
        length.writeUInt32BE(data.length);
        const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
        const crc = Buffer.alloc(4);
        crc.writeUInt32BE(crc32(body));
        return Buffer.concat([length, body, crc]);
    };
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header[8] = 8; // bits per channel
    header[9] = 2; // RGB
    const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, Buffer.from([255, 0, 0]))]);
    const pixels = Buffer.concat(Array.from({ length: height }, () => row));
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0)),
    ]);
}
