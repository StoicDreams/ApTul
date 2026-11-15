use crate::prelude::*;
use serde_json::{Map, Number, Value as Json};
use serde_yaml_ng::Value as Yaml;

/// Convert a YAML document to JSON text.
///
/// YAML allows map keys that JSON does not, such as the numbers OpenAPI uses for response codes (`200:`), so keys are
/// written as text. Merge keys (`<<: *anchor`) are applied first. Values JSON cannot hold, such as `.nan`, become null.
pub fn to_json(text: &str) -> Result<String, String> {
    let mut yaml: Yaml = serde_yaml_ng::from_str(text).map_err(|e| format!("This is not valid YAML: {e}"))?;
    yaml.apply_merge().map_err(|e| format!("A YAML merge key could not be applied: {e}"))?;
    serde_json::to_string(&convert(yaml)).map_err(|e| format!("The YAML could not be converted to JSON: {e}"))
}

fn key_text(key: Yaml) -> String {
    match key {
        Yaml::String(s) => s,
        Yaml::Null => "null".to_string(),
        Yaml::Bool(b) => b.to_string(),
        Yaml::Number(n) => n.to_string(),
        Yaml::Tagged(tagged) => key_text(tagged.value),
        other => serde_json::to_string(&convert(other)).unwrap_or_default(),
    }
}

fn convert(value: Yaml) -> Json {
    match value {
        Yaml::Null => Json::Null,
        Yaml::Bool(b) => Json::Bool(b),
        Yaml::Number(n) => {
            if let Some(i) = n.as_i64() {
                Json::Number(i.into())
            } else if let Some(u) = n.as_u64() {
                Json::Number(u.into())
            } else {
                n.as_f64().and_then(Number::from_f64).map(Json::Number).unwrap_or(Json::Null)
            }
        }
        Yaml::String(s) => Json::String(s),
        Yaml::Sequence(items) => Json::Array(items.into_iter().map(convert).collect()),
        Yaml::Mapping(map) => {
            let mut out = Map::new();
            for (key, value) in map {
                out.insert(key_text(key), convert(value));
            }
            Json::Object(out)
        }
        Yaml::Tagged(tagged) => convert(tagged.value),
    }
}

/// Convert YAML text to JSON text in the worker.
/// ```javascript,ignore
/// const json = await webui.worker.yaml_to_json('openapi: 3.1.0');
/// ```
#[wasm_bindgen]
pub fn yaml_to_json(text: &str) -> Result<String, String> {
    to_json(text)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn numeric_keys_become_text() {
        let json = to_json("responses:\n  200:\n    description: OK\n  default:\n    description: Error\n").unwrap();
        assert_eq!(json, r#"{"responses":{"200":{"description":"OK"},"default":{"description":"Error"}}}"#);
    }

    #[test]
    fn keeps_types_and_order() {
        let json = to_json("b: 1\na: [true, 2.5, null, 'x']\n").unwrap();
        assert_eq!(json, r#"{"b":1,"a":[true,2.5,null,"x"]}"#);
    }

    #[test]
    fn applies_anchors_and_merge_keys() {
        let json = to_json("base: &base\n  type: object\nuser:\n  <<: *base\n  title: User\nlist: [*base]\n").unwrap();
        assert_eq!(json, r#"{"base":{"type":"object"},"user":{"title":"User","type":"object"},"list":[{"type":"object"}]}"#);
    }

    #[test]
    fn explains_bad_yaml() {
        let error = to_json("a: [1, 2\nb: 3").unwrap_err();
        assert!(error.starts_with("This is not valid YAML:"), "{error}");
    }

    #[test]
    fn nan_becomes_null() {
        assert_eq!(to_json("x: .nan").unwrap(), r#"{"x":null}"#);
    }
}
