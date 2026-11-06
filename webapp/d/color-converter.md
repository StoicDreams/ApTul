<webui-data data-page-title="Color Converter" data-page-subtitle="HEX, RGB, HSL, and CMYK" data-page-description="Convert colors between HEX, RGB, HSL, and CMYK. Accepts any CSS color, including named colors, and includes a color picker and live preview."></webui-data>

<webui-quote theme="title">
Convert any color between HEX, RGB, HSL, and CMYK. Type a value in any CSS format, including named colors, or pick one, and copy the format you need.
</webui-quote>

<app-color-converter></app-color-converter>

## How It Works

<webui-page-segment elevation="10">
1. **Enter a Color**: Type a value such as #ff8800, rgb(255, 136, 0), hsl(32, 100%, 50%), or orange, or use the color picker.
1. **See the Preview**: The swatch shows the color, with a checkered pattern behind see-through colors.
1. **Copy a Format**: Each format has its own copy button.
</webui-page-segment>

### Key Features

<webui-page-segment elevation="10">
- **Any CSS Color**: Reads every format your browser supports, including named colors and newer formats such as oklch.
- **Transparency**: Keeps the alpha value, writing HEX with eight digits and using rgba and hsla.
- **Color Picker**: Choose a color visually, and the text box follows.
</webui-page-segment>

## Frequently Asked Questions

<webui-page-segment elevation="10">

### What is the difference between HEX and RGB?

They describe the same color in different ways. RGB gives the red, green, and blue amounts from 0 to 255, and HEX writes those same three numbers in hexadecimal. For example, rgb(255, 136, 0) is #ff8800.

### When should I use HSL?

HSL describes a color by hue, saturation, and lightness, which makes it easy to create lighter, darker, or softer versions of a color by changing one number. Many designers find it easier to adjust than HEX.

### Is the CMYK value exact?

No. CMYK depends on the printer, ink, and paper, so a screen color has no single correct CMYK value. The value shown is a standard conversion that makes a good starting point. Ask your printer for their color profile for exact results.

</webui-page-segment>

<app-related-tools></app-related-tools>
