import { expect } from './site.mjs';

// Helpers for driving Ap Tul tools the way a visitor does.

/** Type into a webui-input-message, replacing what was there. */
export async function typeInto(tool, label, text) {
    await tool.locator(`webui-input-message[label="${label}"] textarea`).fill(text);
}

/** Choose a dropdown option by its value. */
export async function choose(tool, label, value) {
    await tool.locator(`webui-dropdown[label="${label}"] select`).selectOption(value);
}

/** The text currently shown in the tool's app-tool-output. */
export async function outputText(tool) {
    return tool.locator('app-tool-output').evaluate(el => el.getValue());
}

export async function expectOutput(tool, expected) {
    await expect.poll(() => outputText(tool)).toBe(expected);
}

/** Drop text files on the tool's app-file-drop. */
export async function dropText(tool, name, type, content) {
    await tool.locator('app-file-drop').evaluate((el, { name, type, content }) => {
        const transfer = new DataTransfer();
        transfer.items.add(new File([content], name, { type }));
        for (const event of ['dragenter', 'dragover', 'drop']) {
            el.dispatchEvent(new DragEvent(event, { bubbles: true, cancelable: true, dataTransfer: transfer }));
        }
    }, { name, type, content });
}

/** The text of a labelled app-tool-output in the tool, such as one hash or one date format. */
export async function codeText(tool, label) {
    return tool.locator(`app-tool-output[label="${label}"]`).evaluate(el => el.getValue());
}

export async function expectCode(tool, label, expected) {
    await expect.poll(() => codeText(tool, label)).toBe(expected);
}

/** Type into a webui-input-text, then fire change, which is when number fields apply. */
export async function setNumber(tool, label, value) {
    const input = tool.locator(`webui-input-text[label="${label}"] input`);
    await input.fill(`${value}`);
    await input.dispatchEvent('change');
}
