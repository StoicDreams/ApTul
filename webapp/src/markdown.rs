use crate::prelude::*;
use pulldown_cmark::{Options, Parser, html};

/// Convert Markdown to HTML. GitHub style adds tables, strikethrough, task lists, and footnotes.
pub fn to_html(markdown: &str, github: bool) -> String {
    let mut options = Options::empty();
    if github {
        options.insert(Options::ENABLE_TABLES);
        options.insert(Options::ENABLE_STRIKETHROUGH);
        options.insert(Options::ENABLE_TASKLISTS);
        options.insert(Options::ENABLE_FOOTNOTES);
        options.insert(Options::ENABLE_GFM);
    }
    let mut output = String::with_capacity(markdown.len() * 3 / 2);
    html::push_html(&mut output, Parser::new_ext(markdown, options));
    output
}

/// Convert Markdown to HTML.
/// ```javascript,ignore
/// const html = await webui.worker.markdown_to_html('# Title', true);
/// ```
#[wasm_bindgen]
pub fn markdown_to_html(markdown: &str, github: bool) -> String {
    to_html(markdown, github)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn converts_common_markdown() {
        let html = to_html("# Title\n\nSome *text* and `code`.\n\n- one\n- two\n", false);
        assert_eq!(
            html,
            "<h1>Title</h1>\n<p>Some <em>text</em> and <code>code</code>.</p>\n<ul>\n<li>one</li>\n<li>two</li>\n</ul>\n"
        );
    }

    #[test]
    fn github_style_adds_tables_and_task_lists() {
        let md = "| a | b |\n|---|---|\n| 1 | 2 |\n\n- [x] done\n\n~~gone~~\n";
        let github = to_html(md, true);
        assert!(github.contains("<table>") && github.contains("<td>1</td>"), "{github}");
        assert!(github.contains(r#"<input disabled="" type="checkbox" checked=""/>"#), "{github}");
        assert!(github.contains("<del>gone</del>"), "{github}");
        let plain = to_html(md, false);
        assert!(!plain.contains("<table>"));
    }

    #[test]
    fn escapes_code_and_keeps_text_safe() {
        let html = to_html("```html\n<b>&</b>\n```\n\n5 < 6 & 7", false);
        assert!(html.contains(r#"<pre><code class="language-html">&lt;b&gt;&amp;&lt;/b&gt;"#), "{html}");
        assert!(html.contains("5 &lt; 6 &amp; 7"), "{html}");
    }
}
