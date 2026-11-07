<webui-data data-page-title="QR Code Generator" data-page-subtitle="Links, Wi-Fi, and More" data-page-description="Make free QR codes for links, text, Wi-Fi, email, phone calls, and texts. Choose colors and download PNG or SVG. No sign-up, and codes never expire."></webui-data>

<webui-quote theme="title">
Make a QR code for a link, Wi-Fi network, email, phone number, or text message, then download it as PNG or SVG. Codes are made in your browser, contain only what you type, and never expire.
</webui-quote>

<app-qr-code-generator></app-qr-code-generator>

## How It Works

<webui-page-segment elevation="10">
1. **Choose a Type**: Pick Link or Text, Wi-Fi, Email, Phone Call, or Text Message.
1. **Fill In the Details**: The code updates as you type.
1. **Pick Colors**: Dark codes on light backgrounds scan most reliably. You will be warned about colors that are hard to scan.
1. **Download**: Save a PNG at up to 2048 pixels for documents and screens, or an SVG that stays sharp at any size for print.
</webui-page-segment>

### Key Features

<webui-page-segment elevation="10">
- **Wi-Fi Codes**: Guests scan to join your network without typing the password. Special characters in names and passwords are handled for you.
- **Static Codes That Never Expire**: The code holds your link or text directly, with no redirect service in between, so it keeps working forever and nobody tracks the scans.
- **Error Correction**: Higher levels still scan when part of the code is scratched, dirty, or covered by a logo, at the cost of a denser code.
- **Print Ready**: SVG files scale to posters and signs without blurring, and every code has the white border scanners need.
</webui-page-segment>

<app-ad-slot name="content"></app-ad-slot>

## Frequently Asked Questions

<webui-page-segment elevation="10">

### Do these QR codes expire?

No. The link or text is stored in the code itself, so it works for as long as the link does. Codes that expire come from services that send scans through their own redirect link.

### Which error correction level should I use?

Medium suits most codes. Choose High if the code will be printed small, used outdoors, or have a logo placed over its center. Low makes the simplest code, which suits long links shown on screens.

### Can I see how many people scanned my code?

Not with a static code, since phones open the link directly. To count scans, add tracking to the link itself, such as UTM parameters for your analytics.

### How big should I print a QR code?

At least 2 cm (about 1 inch) across for codes scanned up close, such as on business cards. A good rule for posters is one tenth of the distance people will scan from, so a code scanned from 3 meters should be about 30 cm wide.

### Is my Wi-Fi password sent anywhere?

No. The code is made in your browser, and the password is only stored in the image you download.

</webui-page-segment>

<app-ad-slot name="footer"></app-ad-slot>

<app-related-tools></app-related-tools>
