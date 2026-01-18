use crate::prelude::*;
use base64::prelude::*;
use image::imageops::FilterType;
use image::{ImageFormat, load_from_memory};
use kurbo::{Affine, BezPath, PathEl};
use std::f64::consts::PI;
use std::io::Cursor;

/// Helper to format a float with specific precision
fn fmt_f64(val: f64, precision: usize) -> String {
    let s = format!("{:.1$}", val, precision);
    if s.contains('.') {
        s.trim_end_matches('0').trim_end_matches('.').to_string()
    } else {
        s
    }
}

/// Rotates an SVG path around a specific point for multiple angles.
///
/// Arguments:
/// * `path_data`: The SVG path string (e.g., "M0 -70 Q...").
/// * `cx`: The X coordinate of the rotation origin.
/// * `cy`: The Y coordinate of the rotation origin.
/// * `angles_str`: Space-delimited string of angles in degrees (e.g., "0 90 180").
///
/// Returns:
/// * `String`: A newline-separated list of the rotated path strings.
#[wasm_bindgen]
pub fn rotate_svg_path(
    path_data: &str,
    cx: f64,
    cy: f64,
    angles_str: &str,
    precision: usize,
) -> Result<String, String> {
    let path =
        BezPath::from_svg(path_data).map_err(|e| format!("Failed to parse SVG path: {}", e))?;

    let angles: Vec<f64> = angles_str
        .split_whitespace()
        .filter_map(|s| s.parse::<f64>().ok())
        .collect();
    if angles.is_empty() {
        return Err("No valid angles provided".to_string());
    }
    let mut results = Vec::new();
    for angle_deg in angles {
        let angle_rad = angle_deg * (PI / 180.0);
        let transform = Affine::rotate_about(angle_rad, (cx, cy));
        let rotated_path = transform * &path;
        let mut path_str = String::new();
        for el in rotated_path.elements() {
            if !path_str.is_empty() {
                path_str.push(' ');
            }
            match el {
                PathEl::MoveTo(p) => {
                    path_str.push_str(&format!(
                        "M{} {}",
                        fmt_f64(p.x, precision),
                        fmt_f64(p.y, precision)
                    ));
                }
                PathEl::LineTo(p) => {
                    path_str.push_str(&format!(
                        "L{} {}",
                        fmt_f64(p.x, precision),
                        fmt_f64(p.y, precision)
                    ));
                }
                PathEl::QuadTo(p1, p2) => {
                    path_str.push_str(&format!(
                        "Q{} {} {} {}",
                        fmt_f64(p1.x, precision),
                        fmt_f64(p1.y, precision),
                        fmt_f64(p2.x, precision),
                        fmt_f64(p2.y, precision)
                    ));
                }
                PathEl::CurveTo(p1, p2, p3) => {
                    path_str.push_str(&format!(
                        "C{} {} {} {} {} {}",
                        fmt_f64(p1.x, precision),
                        fmt_f64(p1.y, precision),
                        fmt_f64(p2.x, precision),
                        fmt_f64(p2.y, precision),
                        fmt_f64(p3.x, precision),
                        fmt_f64(p3.y, precision)
                    ));
                }
                PathEl::ClosePath => {
                    path_str.push('z');
                }
            }
        }
        results.push(path_str);
    }
    Ok(results.join("\n"))
}

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
