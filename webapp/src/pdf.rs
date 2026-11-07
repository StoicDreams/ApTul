use crate::image::load_upright;
use crate::prelude::*;
use image::{DynamicImage, GenericImageView, ImageFormat, ImageReader};
use lopdf::content::{Content, Operation};
use lopdf::{Dictionary, Document, Object, ObjectId, Stream, dictionary};
use std::collections::HashSet;
use std::io::Cursor;

/// Split one buffer of several files back into the files, using their lengths.
/// The worker takes one buffer, since that is the simplest thing to send it.
fn split_files<'a>(data: &'a [u8], lengths: &[u32]) -> Result<Vec<&'a [u8]>, String> {
    let mut files = Vec::with_capacity(lengths.len());
    let mut start = 0usize;
    for &length in lengths {
        let end = start + length as usize;
        if end > data.len() {
            return Err("The files did not arrive whole. Try adding them again.".to_string());
        }
        files.push(&data[start..end]);
        start = end;
    }
    Ok(files)
}

/// Load a PDF, with a readable message when it cannot be opened.
fn load(bytes: &[u8], name: &str) -> Result<Document, String> {
    let mut doc = Document::load_mem(bytes).map_err(|e| format!("{name} could not be read as a PDF ({e})."))?;
    if doc.trailer.has(b"Encrypt") {
        if doc.encryption_state.is_none() {
            return Err(format!("{name} needs a password to open, so it cannot be changed here."));
        }
        // Opened without a password, so lopdf has already decrypted it. Save it as a plain file.
        doc.trailer.remove(b"Encrypt");
        doc.encryption_state = None;
    }
    if doc.get_pages().is_empty() {
        return Err(format!("{name} has no pages."));
    }
    Ok(doc)
}

fn save(doc: &mut Document) -> Result<Vec<u8>, String> {
    doc.prune_objects();
    doc.renumber_objects();
    doc.compress();
    let mut output = Vec::new();
    doc.save_to(&mut output).map_err(|e| format!("Could not save the PDF ({e})."))?;
    Ok(output)
}

/// Find a page attribute that may be set on the page or inherited from the page tree above it.
fn inherited(doc: &Document, page_id: ObjectId, key: &[u8]) -> Option<Object> {
    let mut current = page_id;
    let mut visited = HashSet::new();
    while visited.insert(current) {
        let node = doc.get_dictionary(current).ok()?;
        if let Ok(value) = node.get(key) {
            return Some(value.clone());
        }
        current = node.get(b"Parent").and_then(Object::as_reference).ok()?;
    }
    None
}

pub fn page_count(bytes: &[u8]) -> Result<u32, String> {
    Ok(load(bytes, "This file")?.get_pages().len() as u32)
}

/// Join PDFs into one, in the order given, keeping every page's size, rotation, and content.
pub fn merge(files: &[&[u8]]) -> Result<Vec<u8>, String> {
    if files.len() < 2 {
        return Err("Add at least two PDFs to merge.".to_string());
    }
    let mut merged = Document::with_version("1.7");
    let pages_id = merged.new_object_id();
    let mut kids: Vec<Object> = Vec::new();
    for (index, bytes) in files.iter().enumerate() {
        let mut doc = load(bytes, &format!("File {}", index + 1))?;
        // Copy inherited attributes onto each page first, since the page tree they came from is not copied.
        let page_ids: Vec<ObjectId> = doc.get_pages().into_values().collect();
        for &page_id in &page_ids {
            let mut page = doc.get_dictionary(page_id).map_err(|e| e.to_string())?.clone();
            for key in ["MediaBox", "CropBox", "Resources", "Rotate"] {
                if let Some(value) = inherited(&doc, page_id, key.as_bytes()) {
                    page.set(key, value);
                }
            }
            doc.objects.insert(page_id, Object::Dictionary(page));
        }
        // Give this file's objects numbers after the ones already merged, so none collide.
        let start = merged.max_id + 1;
        let order: Vec<u32> = doc.get_pages().keys().copied().collect();
        doc.renumber_objects_with(start);
        merged.max_id = doc.max_id;
        let pages = doc.get_pages();
        let mut skipped: HashSet<ObjectId> = HashSet::new();
        // The old page tree and catalog are replaced by the merged one. Pages are re-added below, in page order.
        for (&id, object) in doc.objects.iter() {
            if let Ok(kind) = object.type_name()
                && matches!(kind, b"Catalog" | b"Pages" | b"Outlines" | b"Outline")
            {
                skipped.insert(id);
            }
        }
        for (id, object) in doc.objects.into_iter() {
            if !skipped.contains(&id) {
                merged.objects.insert(id, object);
            }
        }
        for number in order {
            let page_id = pages[&number];
            if let Some(Object::Dictionary(page)) = merged.objects.get_mut(&page_id) {
                page.set("Parent", pages_id);
                // Links and form fields that pointed into the old page tree no longer resolve, so drop them.
                page.remove(b"StructParents");
            }
            kids.push(page_id.into());
        }
    }
    let count = kids.len() as i64;
    merged.objects.insert(
        pages_id,
        Object::Dictionary(dictionary! { "Type" => "Pages", "Kids" => kids, "Count" => count }),
    );
    let catalog_id = merged.add_object(dictionary! { "Type" => "Catalog", "Pages" => pages_id });
    merged.trailer.set("Root", catalog_id);
    save(&mut merged)
}

/// Keep only the given pages (numbered from 1), in their original order.
pub fn extract(bytes: &[u8], keep: &[u32]) -> Result<Vec<u8>, String> {
    let mut doc = load(bytes, "This PDF")?;
    let total = doc.get_pages().len() as u32;
    let keep: HashSet<u32> = keep.iter().copied().collect();
    if keep.is_empty() {
        return Err("Choose at least one page.".to_string());
    }
    if let Some(page) = keep.iter().find(|&&page| page == 0 || page > total) {
        return Err(format!("Page {page} is not in this PDF, which has {total} pages."));
    }
    // Pages that are deleted no longer need their inherited attributes, but the ones kept do.
    for page_id in doc.get_pages().into_values() {
        let mut page = doc.get_dictionary(page_id).map_err(|e| e.to_string())?.clone();
        for key in ["MediaBox", "CropBox", "Resources", "Rotate"] {
            if let Some(value) = inherited(&doc, page_id, key.as_bytes()) {
                page.set(key, value);
            }
        }
        doc.objects.insert(page_id, Object::Dictionary(page));
    }
    let remove: Vec<u32> = (1..=total).filter(|page| !keep.contains(page)).collect();
    doc.delete_pages(&remove);
    // Bookmarks can point at deleted pages, so they are left out.
    if let Ok(catalog) = doc.catalog_mut() {
        catalog.remove(b"Outlines");
    }
    save(&mut doc)
}

/// Page size in points (1/72 inch), and how much space to leave around the image.
#[derive(Clone, Copy)]
pub struct Layout {
    pub page: &'static str,
    pub margin: f32,
}

fn page_size(layout: Layout, width: f32, height: f32) -> (f32, f32) {
    let (w, h) = match layout.page {
        "a4" => (595.28, 841.89),
        "letter" => (612.0, 792.0),
        // The image's own size, at 96 pixels per inch, plus the margin.
        _ => return (width * 0.75 + layout.margin * 2.0, height * 0.75 + layout.margin * 2.0),
    };
    // Turn the page to match the image, so landscape photos are not shrunk onto a portrait page.
    if width > height { (h, w) } else { (w, h) }
}

/// An image ready to place in a PDF: its stream and size in pixels.
struct PdfImage {
    stream: Stream,
    alpha: Option<Stream>,
    width: u32,
    height: u32,
}

fn jpeg_stream(data: Vec<u8>, width: u32, height: u32, color: &str) -> Stream {
    Stream::new(
        dictionary! {
            "Type" => "XObject", "Subtype" => "Image", "Width" => width as i64, "Height" => height as i64,
            "ColorSpace" => color, "BitsPerComponent" => 8, "Filter" => "DCTDecode",
        },
        data,
    )
}

/// How a JPEG is stored, read from its header: whether it is upright, and its colors before decoding.
fn jpeg_info(bytes: &[u8]) -> Option<(bool, image::ExtendedColorType)> {
    use image::ImageDecoder;
    let reader = ImageReader::new(Cursor::new(bytes)).with_guessed_format().ok()?;
    let mut decoder = reader.into_decoder().ok()?;
    let upright = matches!(decoder.orientation(), Ok(image::metadata::Orientation::NoTransforms));
    Some((upright, decoder.original_color_type()))
}

fn pdf_image(bytes: &[u8], name: &str) -> Result<PdfImage, String> {
    use image::ExtendedColorType;
    let format = ImageReader::new(Cursor::new(bytes)).with_guessed_format().map_err(|e| e.to_string())?.format();
    let image = load_upright(bytes).map_err(|_| format!("{name} is not an image this tool can read."))?;
    let (width, height) = image.dimensions();
    if format == Some(ImageFormat::Jpeg) {
        let info = jpeg_info(bytes);
        // An upright gray or RGB JPEG goes in as it is, so it keeps its quality and size.
        match info {
            Some((true, ExtendedColorType::L8)) => {
                return Ok(PdfImage { stream: jpeg_stream(bytes.to_vec(), width, height, "DeviceGray"), alpha: None, width, height });
            }
            Some((true, ExtendedColorType::Rgb8)) => {
                return Ok(PdfImage { stream: jpeg_stream(bytes.to_vec(), width, height, "DeviceRGB"), alpha: None, width, height });
            }
            _ => {}
        }
        // Phone photos that need turning, and CMYK print files, are saved again as a high quality JPEG.
        // Storing them without compression instead would make the PDF many times larger.
        let mut data = Vec::new();
        image::codecs::jpeg::JpegEncoder::new_with_quality(&mut data, 92)
            .encode_image(&DynamicImage::ImageRgb8(image.to_rgb8()))
            .map_err(|e| e.to_string())?;
        return Ok(PdfImage { stream: jpeg_stream(data, width, height, "DeviceRGB"), alpha: None, width, height });
    }
    let has_alpha = image.color().has_alpha();
    let mut stream = Stream::new(
        dictionary! {
            "Type" => "XObject", "Subtype" => "Image", "Width" => width as i64, "Height" => height as i64,
            "ColorSpace" => "DeviceRGB", "BitsPerComponent" => 8,
        },
        image.to_rgb8().into_raw(),
    );
    stream.compress().map_err(|e| e.to_string())?;
    let alpha = if has_alpha {
        let mut mask = Stream::new(
            dictionary! {
                "Type" => "XObject", "Subtype" => "Image", "Width" => width as i64, "Height" => height as i64,
                "ColorSpace" => "DeviceGray", "BitsPerComponent" => 8,
            },
            image.to_rgba8().pixels().map(|p| p[3]).collect(),
        );
        mask.compress().map_err(|e| e.to_string())?;
        Some(mask)
    } else {
        None
    };
    Ok(PdfImage { stream, alpha, width, height })
}

/// Put each image on its own page, scaled to fit inside the margins and centered.
pub fn images_to_pdf(files: &[&[u8]], layout: Layout) -> Result<Vec<u8>, String> {
    if files.is_empty() {
        return Err("Add at least one image.".to_string());
    }
    let mut doc = Document::with_version("1.7");
    let pages_id = doc.new_object_id();
    let mut kids: Vec<Object> = Vec::new();
    for (index, bytes) in files.iter().enumerate() {
        let image = pdf_image(bytes, &format!("Image {}", index + 1))?;
        let (page_w, page_h) = page_size(layout, image.width as f32, image.height as f32);
        let room_w = (page_w - layout.margin * 2.0).max(1.0);
        let room_h = (page_h - layout.margin * 2.0).max(1.0);
        let scale = (room_w / image.width as f32).min(room_h / image.height as f32);
        let (draw_w, draw_h) = (image.width as f32 * scale, image.height as f32 * scale);
        let (x, y) = ((page_w - draw_w) / 2.0, (page_h - draw_h) / 2.0);
        let mut stream = image.stream;
        if let Some(alpha) = image.alpha {
            let mask_id = doc.add_object(alpha);
            stream.dict.set("SMask", mask_id);
        }
        let image_id = doc.add_object(stream);
        let content = Content {
            operations: vec![
                Operation::new("q", vec![]),
                Operation::new("cm", vec![draw_w.into(), 0.into(), 0.into(), draw_h.into(), x.into(), y.into()]),
                Operation::new("Do", vec!["Im0".into()]),
                Operation::new("Q", vec![]),
            ],
        };
        let content_id = doc.add_object(Stream::new(Dictionary::new(), content.encode().map_err(|e| e.to_string())?));
        let page_id = doc.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "MediaBox" => vec![0.into(), 0.into(), page_w.into(), page_h.into()],
            "Contents" => content_id,
            "Resources" => dictionary! { "XObject" => dictionary! { "Im0" => image_id } },
        });
        kids.push(page_id.into());
    }
    let count = kids.len() as i64;
    doc.objects.insert(pages_id, Object::Dictionary(dictionary! { "Type" => "Pages", "Kids" => kids, "Count" => count }));
    let catalog_id = doc.add_object(dictionary! { "Type" => "Catalog", "Pages" => pages_id });
    doc.trailer.set("Root", catalog_id);
    let mut output = Vec::new();
    doc.save_to(&mut output).map_err(|e| format!("Could not save the PDF ({e})."))?;
    Ok(output)
}

/// Count the pages in a PDF.
/// ```javascript,ignore
/// const pages = await webui.worker.pdf_page_count(bytes);
/// ```
#[wasm_bindgen]
pub fn pdf_page_count(bytes: &[u8]) -> Result<u32, String> {
    page_count(bytes)
}

/// Merge PDFs. `data` holds the files one after another, and `lengths` gives each file's size.
/// ```javascript,ignore
/// const merged = await webui.worker.merge_pdfs(data, new Uint32Array([a.length, b.length]));
/// ```
#[wasm_bindgen]
pub fn merge_pdfs(data: &[u8], lengths: Vec<u32>) -> Result<Vec<u8>, String> {
    merge(&split_files(data, &lengths)?)
}

/// Make a PDF of only the given pages, numbered from 1.
/// ```javascript,ignore
/// const part = await webui.worker.extract_pdf_pages(bytes, new Uint32Array([1, 2, 5]));
/// ```
#[wasm_bindgen]
pub fn extract_pdf_pages(bytes: &[u8], pages: Vec<u32>) -> Result<Vec<u8>, String> {
    extract(bytes, &pages)
}

/// Make a PDF with one image per page. `page` is fit, a4, or letter, and `margin` is in points.
/// ```javascript,ignore
/// const pdf = await webui.worker.images_to_pdf_file(data, new Uint32Array([a.length]), 'a4', 36);
/// ```
#[wasm_bindgen]
pub fn images_to_pdf_file(data: &[u8], lengths: Vec<u32>, page: &str, margin: f32) -> Result<Vec<u8>, String> {
    let page = match page {
        "a4" => "a4",
        "letter" => "letter",
        _ => "fit",
    };
    images_to_pdf(&split_files(data, &lengths)?, Layout { page, margin: margin.clamp(0.0, 144.0) })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A PDF with one page per label, each page a given size, with its label written on it.
    fn sample(labels: &[&str], size: (i64, i64)) -> Vec<u8> {
        let mut doc = Document::with_version("1.5");
        let pages_id = doc.new_object_id();
        let font_id = doc.add_object(dictionary! { "Type" => "Font", "Subtype" => "Type1", "BaseFont" => "Courier" });
        // Resources and size live on the page tree, so merging has to copy them down to each page.
        let resources_id = doc.add_object(dictionary! { "Font" => dictionary! { "F1" => font_id } });
        let mut kids = Vec::new();
        for label in labels {
            let content = Content {
                operations: vec![
                    Operation::new("BT", vec![]),
                    Operation::new("Tf", vec!["F1".into(), 24.into()]),
                    Operation::new("Tj", vec![Object::string_literal(*label)]),
                    Operation::new("ET", vec![]),
                ],
            };
            let content_id = doc.add_object(Stream::new(dictionary! {}, content.encode().unwrap()));
            kids.push(doc.add_object(dictionary! { "Type" => "Page", "Parent" => pages_id, "Contents" => content_id }).into());
        }
        let count = kids.len() as i64;
        doc.objects.insert(
            pages_id,
            Object::Dictionary(dictionary! {
                "Type" => "Pages", "Kids" => kids, "Count" => count,
                "Resources" => resources_id, "MediaBox" => vec![0.into(), 0.into(), size.0.into(), size.1.into()],
            }),
        );
        let catalog_id = doc.add_object(dictionary! { "Type" => "Catalog", "Pages" => pages_id });
        doc.trailer.set("Root", catalog_id);
        let mut bytes = Vec::new();
        doc.save_to(&mut bytes).unwrap();
        bytes
    }

    /// The label on each page, in page order, and each page's size.
    fn pages(bytes: &[u8]) -> Vec<(String, Vec<f32>)> {
        let doc = Document::load_mem(bytes).unwrap();
        doc.get_pages()
            .into_values()
            .map(|id| {
                let content = Content::decode(&doc.get_page_content(id)).unwrap();
                let text = content
                    .operations
                    .iter()
                    .find(|op| op.operator == "Tj")
                    .map(|op| String::from_utf8_lossy(op.operands[0].as_str().unwrap()).to_string())
                    .unwrap_or_default();
                let size = inherited(&doc, id, b"MediaBox").unwrap();
                let size = size.as_array().unwrap().iter().map(|n| n.as_float().unwrap()).collect();
                // Fonts must still resolve, or the text would not show.
                let resources = inherited(&doc, id, b"Resources").unwrap();
                let resources = match resources {
                    Object::Reference(r) => doc.get_dictionary(r).unwrap().clone(),
                    Object::Dictionary(d) => d,
                    _ => panic!("resources"),
                };
                assert!(resources.get(b"Font").is_ok());
                (text, size)
            })
            .collect()
    }

    #[test]
    fn merges_in_order_and_keeps_each_page_size() {
        let a = sample(&["a1", "a2"], (612, 792));
        let b = sample(&["b1"], (595, 842));
        let merged = merge(&[&a, &b, &a]).unwrap();
        let result = pages(&merged);
        let labels: Vec<&str> = result.iter().map(|(t, _)| t.as_str()).collect();
        assert_eq!(labels, ["a1", "a2", "b1", "a1", "a2"]);
        assert_eq!(result[2].1, vec![0.0, 0.0, 595.0, 842.0]);
        assert_eq!(result[0].1, vec![0.0, 0.0, 612.0, 792.0]);
        assert_eq!(page_count(&merged).unwrap(), 5);
    }

    #[test]
    fn merge_needs_two_readable_files() {
        let a = sample(&["a"], (612, 792));
        assert!(merge(&[&a]).unwrap_err().contains("two"));
        let error = merge(&[&a, b"not a pdf"]).unwrap_err();
        assert!(error.starts_with("File 2"), "{error}");
    }

    #[test]
    fn extracts_pages_in_original_order() {
        let doc = sample(&["1", "2", "3", "4", "5"], (612, 792));
        let part = extract(&doc, &[4, 2, 2]).unwrap();
        let labels: Vec<String> = pages(&part).into_iter().map(|(t, _)| t).collect();
        assert_eq!(labels, ["2", "4"]);
        assert!(part.len() < doc.len(), "removed pages are not kept in the file");
        assert!(extract(&doc, &[6]).unwrap_err().contains("Page 6"));
        assert!(extract(&doc, &[]).is_err());
    }

    #[test]
    fn password_protected_files_are_refused_and_restricted_ones_open() {
        use lopdf::{EncryptionState, EncryptionVersion, Permissions};
        let encrypt = |user: &str| {
            let mut doc = Document::load_mem(&sample(&["secret"], (612, 792))).unwrap();
            // Encryption keys are made from the file ID, so encrypted files always have one.
            let id = Object::String(b"0123456789abcdef".to_vec(), lopdf::StringFormat::Hexadecimal);
            doc.trailer.set("ID", vec![id.clone(), id]);
            let version = EncryptionVersion::V2 {
                document: &doc,
                owner_password: "owner",
                user_password: user,
                key_length: 128,
                permissions: Permissions::PRINTABLE,
            };
            let state = EncryptionState::try_from(version).unwrap();
            doc.encrypt(&state).unwrap();
            let mut bytes = Vec::new();
            doc.save_to(&mut bytes).unwrap();
            bytes
        };
        let locked = encrypt("user");
        assert!(page_count(&locked).unwrap_err().contains("password"));
        // Only an owner password: it opens without one, and the result is a plain PDF.
        let restricted = encrypt("");
        let part = extract(&restricted, &[1]).unwrap();
        let doc = Document::load_mem(&part).unwrap();
        assert!(!doc.trailer.has(b"Encrypt"));
        assert_eq!(pages(&part)[0].0, "secret");
    }

    fn png(width: u32, height: u32, alpha: bool) -> Vec<u8> {
        let image = if alpha {
            DynamicImage::ImageRgba8(image::RgbaImage::from_pixel(width, height, image::Rgba([255, 0, 0, 128])))
        } else {
            DynamicImage::ImageRgb8(image::RgbImage::from_pixel(width, height, image::Rgb([0, 0, 255])))
        };
        let mut bytes = Cursor::new(Vec::new());
        image.write_to(&mut bytes, ImageFormat::Png).unwrap();
        bytes.into_inner()
    }

    fn jpg(width: u32, height: u32) -> Vec<u8> {
        let image = DynamicImage::ImageRgb8(image::RgbImage::from_pixel(width, height, image::Rgb([0, 128, 0])));
        let mut bytes = Cursor::new(Vec::new());
        image.write_to(&mut bytes, ImageFormat::Jpeg).unwrap();
        bytes.into_inner()
    }

    fn media_boxes(bytes: &[u8]) -> Vec<Vec<f32>> {
        let doc = Document::load_mem(bytes).unwrap();
        doc.get_pages()
            .into_values()
            .map(|id| {
                let page = doc.get_dictionary(id).unwrap();
                page.get(b"MediaBox").unwrap().as_array().unwrap().iter().map(|n| n.as_float().unwrap()).collect()
            })
            .collect()
    }

    #[test]
    fn images_become_one_page_each() {
        let photo = jpg(400, 300);
        let pdf = images_to_pdf(&[&photo, &png(100, 200, true)], Layout { page: "a4", margin: 36.0 }).unwrap();
        let boxes = media_boxes(&pdf);
        // The landscape photo turns the page sideways, and the portrait image keeps it upright.
        assert_eq!(boxes[0][2..], [841.89, 595.28]);
        assert_eq!(boxes[1][2..], [595.28, 841.89]);
        let doc = Document::load_mem(&pdf).unwrap();
        let images: Vec<&Stream> = doc
            .objects
            .values()
            .filter_map(|o| o.as_stream().ok())
            .filter(|s| s.dict.get(b"Subtype").and_then(Object::as_name).ok() == Some(b"Image".as_slice()))
            .collect();
        // The JPEG goes in unchanged, and the transparent PNG keeps its transparency as a mask.
        assert!(images.iter().any(|s| s.content == photo));
        assert!(images.iter().any(|s| s.dict.has(b"SMask")));
    }

    /// A JPEG with an EXIF tag saying it must be turned a quarter turn, as phones save portrait photos.
    fn rotated_jpg(width: u32, height: u32) -> Vec<u8> {
        let plain = jpg(width, height);
        // Orientation 6: rotate 90 degrees clockwise to display.
        let tiff: [u8; 26] = [
            b'M', b'M', 0, 42, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0,
        ];
        let mut app1 = vec![0xFF, 0xE1];
        let length = (2 + 6 + tiff.len()) as u16;
        app1.extend_from_slice(&length.to_be_bytes());
        app1.extend_from_slice(b"Exif\0\0");
        app1.extend_from_slice(&tiff);
        let mut out = plain[..2].to_vec();
        out.extend_from_slice(&app1);
        out.extend_from_slice(&plain[2..]);
        out
    }

    #[test]
    fn rotated_photos_are_turned_and_stay_jpeg() {
        let photo = rotated_jpg(400, 300);
        let pdf = images_to_pdf(&[&photo], Layout { page: "fit", margin: 0.0 }).unwrap();
        // Turned upright, the 400 x 300 photo is 300 wide and 400 tall.
        assert_eq!(media_boxes(&pdf)[0][2..], [225.0, 300.0]);
        let doc = Document::load_mem(&pdf).unwrap();
        let image = doc.objects.values().filter_map(|o| o.as_stream().ok())
            .find(|s| s.dict.get(b"Subtype").and_then(Object::as_name).ok() == Some(b"Image".as_slice()))
            .unwrap();
        assert_eq!(image.dict.get(b"Filter").unwrap().as_name().unwrap(), b"DCTDecode");
        assert_eq!(image.dict.get(b"Width").unwrap().as_i64().unwrap(), 300);
        assert!(pdf.len() < photo.len() * 4, "saved as JPEG, not as raw pixels");
    }

    #[test]
    fn fit_pages_match_the_image() {
        let pdf = images_to_pdf(&[&png(400, 200, false)], Layout { page: "fit", margin: 0.0 }).unwrap();
        assert_eq!(media_boxes(&pdf)[0][2..], [300.0, 150.0]);
        assert!(images_to_pdf(&[b"nope"], Layout { page: "fit", margin: 0.0 }).unwrap_err().contains("Image 1"));
    }

    #[test]
    fn split_files_checks_lengths() {
        assert_eq!(split_files(b"abcdef", &[2, 4]).unwrap(), vec![b"ab".as_slice(), b"cdef".as_slice()]);
        assert!(split_files(b"abc", &[2, 4]).is_err());
    }
}
