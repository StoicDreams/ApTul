use crate::prelude::*;
use base64::prelude::*;
use image::imageops::FilterType;
use image::{ImageFormat, load_from_memory};
use std::io::Cursor;

/// Resizes an image and converts it to the specified format.
///
/// Arguments:
/// * `data`: Raw bytes of the image file (Uint8Array from JS).
/// * `width`: Target width.
/// * `height`: Target height.
/// * `format`: Target format string ("png", "jpeg", "webp", "ico").
///
/// Returns:
/// * `Vec<u8>`: The processed image bytes.
#[wasm_bindgen]
pub fn process_image(
    base64_input: &str,
    width: u32,
    height: u32,
    format: &str,
) -> Result<String, String> {
    // Strip Data URI Header if present
    // (e.g., "data:image/png;base64,..." -> "...")
    let clean_base64 = match base64_input.find(',') {
        Some(index) => &base64_input[index + 1..],
        None => base64_input,
    };

    // Decode Base64 to Bytes using base64 v0.22
    // BASE64_STANDARD is the standard alphabet with padding
    let bytes = BASE64_STANDARD
        .decode(clean_base64)
        .map_err(|e| format!("Base64 decode failed: {}", e))?;

    // Load the image from memory
    // image v0.25 still uses load_from_memory for guessing formats
    let img = load_from_memory(&bytes).map_err(|e| format!("Failed to load image: {}", e))?;

    // Resize the image
    // FilterType::Lanczos3 is high quality, slow. Use Triangle for speed.
    let scaled = img.resize_exact(width, height, FilterType::Lanczos3);

    // Determine output format and MIME type
    let (output_format, mime_type) = match format.to_lowercase().as_str() {
        "png" => (ImageFormat::Png, "image/png"),
        "jpg" | "jpeg" => (ImageFormat::Jpeg, "image/jpeg"),
        "webp" => (ImageFormat::WebP, "image/webp"),
        "ico" => (ImageFormat::Ico, "image/x-icon"),
        "bmp" => (ImageFormat::Bmp, "image/bmp"),
        _ => return Err(format!("Unsupported format: {}", format)),
    };

    // Write image to an internal buffer
    let mut buffer = Cursor::new(Vec::new());
    scaled
        .write_to(&mut buffer, output_format)
        .map_err(|e| format!("Failed to write output: {}", e))?;

    // Encode buffer back to Base64
    let output_base64 = BASE64_STANDARD.encode(buffer.into_inner());

    // Return formatted Data URI
    Ok(format!("data:{};base64,{}", mime_type, output_base64))
}
