use crate::prelude::*;
use qrcode::{Color, EcLevel, QrCode};
use std::fmt::Write;

/// Quiet zone around the code, in modules. Four is what the QR standard asks for, so phones scan it reliably.
const QUIET_ZONE: usize = 4;

fn ec_level(level: &str) -> EcLevel {
    match level.to_ascii_uppercase().as_str() {
        "L" => EcLevel::L,
        "Q" => EcLevel::Q,
        "H" => EcLevel::H,
        _ => EcLevel::M,
    }
}

/// Only allow colors written as #rgb or #rrggbb, since they go into the SVG markup.
fn safe_color(color: &str, fallback: &'static str) -> String {
    let valid = color.len() == 4 || color.len() == 7;
    if valid && color.starts_with('#') && color[1..].chars().all(|c| c.is_ascii_hexdigit()) {
        color.to_string()
    } else {
        fallback.to_string()
    }
}

/// Build a QR code as SVG, one unit per module, so it scales to any size without blurring.
pub fn qr_code_svg(text: &str, level: &str, dark: &str, light: &str) -> Result<String, String> {
    if text.is_empty() {
        return Err("Enter something to put in the QR code.".to_string());
    }
    let code = QrCode::with_error_correction_level(text.as_bytes(), ec_level(level)).map_err(|e| match e {
        qrcode::types::QrError::DataTooLong => {
            "That is too much to fit in a QR code. Shorten it, or choose a lower error correction level.".to_string()
        }
        other => format!("Could not make a QR code: {other}"),
    })?;
    let width = code.width();
    let size = width + QUIET_ZONE * 2;
    let colors = code.to_colors();
    // One path of 1x1 squares, joined along each row, keeps the file small.
    let mut path = String::new();
    for y in 0..width {
        let mut x = 0;
        while x < width {
            if colors[y * width + x] == Color::Dark {
                let start = x;
                while x < width && colors[y * width + x] == Color::Dark {
                    x += 1;
                }
                let _ = write!(path, "M{} {}h{}v1h-{}z", start + QUIET_ZONE, y + QUIET_ZONE, x - start, x - start);
            } else {
                x += 1;
            }
        }
    }
    Ok(format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" shape-rendering="crispEdges"><rect width="{size}" height="{size}" fill="{}"/><path d="{path}" fill="{}"/></svg>"#,
        safe_color(light, "#ffffff"),
        safe_color(dark, "#000000"),
    ))
}

/// Make a QR code as SVG markup.
/// ```javascript,ignore
/// const svg = await webui.worker.qr_code('https://aptul.com', 'M', '#000000', '#ffffff');
/// ```
#[wasm_bindgen]
pub fn qr_code(text: &str, level: &str, dark: &str, light: &str) -> Result<String, String> {
    qr_code_svg(text, level, dark, light)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn makes_a_square_svg_with_a_quiet_zone() {
        let svg = qr_code_svg("https://aptul.com", "M", "#000000", "#ffffff").unwrap();
        // Version 2 is 25 modules wide, plus 4 on each side.
        assert!(svg.contains(r#"viewBox="0 0 33 33""#), "{svg}");
        assert!(svg.contains(r##"fill="#ffffff""##));
        assert!(svg.contains("M4 4h7v1h-7z"), "the top left finder pattern starts after the quiet zone");
    }

    #[test]
    fn higher_error_correction_makes_a_bigger_code() {
        let low = qr_code_svg("https://aptul.com/qr-code-generator", "L", "#000", "#fff").unwrap();
        let high = qr_code_svg("https://aptul.com/qr-code-generator", "H", "#000", "#fff").unwrap();
        assert!(high.len() > low.len());
    }

    /// Draw the SVG's path back into pixels, then read it with a QR scanner, to prove the drawing is right.
    fn scan(svg: &str) -> String {
        let size: usize = svg.split("viewBox=\"0 0 ").nth(1).unwrap().split(' ').next().unwrap().parse().unwrap();
        let path = svg.split(" d=\"").nth(1).unwrap().split('"').next().unwrap();
        const SCALE: usize = 4;
        let mut pixels = vec![255u8; size * size * SCALE * SCALE];
        for square in path.split('z').filter(|p| !p.is_empty()) {
            // Each square is "M{x} {y}h{w}v1h-{w}".
            let rest = &square[1..];
            let (x, rest) = rest.split_once(' ').unwrap();
            let (y, rest) = rest.split_once('h').unwrap();
            let w = rest.split('v').next().unwrap();
            let (x, y, w): (usize, usize, usize) = (x.parse().unwrap(), y.parse().unwrap(), w.parse().unwrap());
            for py in y * SCALE..(y + 1) * SCALE {
                for px in x * SCALE..(x + w) * SCALE {
                    pixels[py * size * SCALE + px] = 0;
                }
            }
        }
        let width = size * SCALE;
        let mut image = rqrr::PreparedImage::prepare_from_greyscale(width, width, |x, y| pixels[y * width + x]);
        let grids = image.detect_grids();
        assert_eq!(grids.len(), 1, "one QR code is found");
        grids[0].decode().unwrap().1
    }

    #[test]
    fn codes_scan_back_to_their_text() {
        for (text, level) in [
            ("https://aptul.com/qr-code-generator?a=1&b=2", "M"),
            ("WIFI:T:WPA;S:My\\;Net;P:pa\\:ss\\,word;;", "Q"),
            ("Hello, 世界! Unicode works too.", "H"),
            ("L", "L"),
        ] {
            assert_eq!(scan(&qr_code_svg(text, level, "#000", "#fff").unwrap()), text);
        }
    }

    #[test]
    fn rejects_empty_and_too_long_text() {
        assert!(qr_code_svg("", "M", "#000", "#fff").is_err());
        let error = qr_code_svg(&"x".repeat(3000), "H", "#000", "#fff").unwrap_err();
        assert!(error.contains("too much"), "{error}");
    }

    #[test]
    fn unsafe_colors_fall_back_to_black_and_white() {
        let svg = qr_code_svg("a", "M", "\"/><script>", "red").unwrap();
        assert!(!svg.contains("script"));
        assert!(svg.contains(r##"fill="#000000""##) && svg.contains(r##"fill="#ffffff""##));
    }
}
