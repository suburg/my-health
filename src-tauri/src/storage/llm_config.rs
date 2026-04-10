use serde::Deserialize;
use std::path::Path;

/// Конфигурация LLM из config.json
#[derive(Debug, Deserialize)]
pub struct LlmConfig {
    #[serde(rename = "apiUrl")]
    pub api_url: String,
    #[serde(rename = "apiKey")]
    pub api_key: String,
    pub model: String,
    pub timeout: Option<u64>,
}

/// Загрузить конфигурацию LLM из config.json в директории приложения.
pub fn load_llm_config(app_data_dir: &Path) -> Option<LlmConfig> {
    let config_path = app_data_dir.join("config.json");
    let content = std::fs::read_to_string(&config_path).ok()?;
    let config: serde_json::Value = serde_json::from_str(&content).ok()?;
    let llm = config.get("llm")?;
    serde_json::from_value(llm.clone()).ok()
}
