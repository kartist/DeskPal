use serde::{Deserialize, Serialize};

// ---- Data types ----

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct JarInfo {
    pub id: String,
    pub name: String,
    pub uploaded: Option<i64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct JobInfo {
    pub id: String,
    pub name: String,
    pub state: String,
    pub start_time: Option<i64>,
    pub end_time: Option<i64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SavepointStatus {
    pub status: String,
    pub location: Option<String>,
}

// ---- HTTP helpers ----

fn do_get(flink_url: &str, path: &str) -> Result<serde_json::Value, String> {
    let url = format!("{}{}", flink_url.trim_end_matches('/'), path);
    let resp = reqwest::blocking::get(&url)
        .map_err(|e| format!("GET {} failed: {}", url, e))?;
    if resp.status().is_client_error() || resp.status().is_server_error() {
        let status = resp.status();
        let body = resp.text().unwrap_or_default();
        return Err(format!("GET {} returned {}: {}", url, status, body));
    }
    resp.json::<serde_json::Value>()
        .map_err(|e| format!("GET {} parse error: {}", url, e))
}

fn do_post(
    flink_url: &str,
    path: &str,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let url = format!("{}{}", flink_url.trim_end_matches('/'), path);
    let client = reqwest::blocking::Client::new();
    let resp = client
        .post(&url)
        .json(&body)
        .send()
        .map_err(|e| format!("POST {} failed: {}", url, e))?;
    if resp.status().is_client_error() || resp.status().is_server_error() {
        let status = resp.status();
        let body = resp.text().unwrap_or_default();
        return Err(format!("POST {} returned {}: {}", url, status, body));
    }
    resp.json::<serde_json::Value>()
        .map_err(|e| format!("POST {} parse error: {}", url, e))
}

fn do_patch(flink_url: &str, path: &str) -> Result<(), String> {
    let url = format!("{}{}", flink_url.trim_end_matches('/'), path);
    let client = reqwest::blocking::Client::new();
    let resp = client
        .patch(&url)
        .send()
        .map_err(|e| format!("PATCH {} failed: {}", url, e))?;
    if resp.status().is_client_error() || resp.status().is_server_error() {
        let status = resp.status();
        let body = resp.text().unwrap_or_default();
        return Err(format!("PATCH {} returned {}: {}", url, status, body));
    }
    Ok(())
}

// ---- Flink REST commands ----

#[tauri::command]
pub fn flink_check_url(flink_url: String) -> Result<(), String> {
    let url = format!("{}/overview", flink_url.trim_end_matches('/'));
    reqwest::blocking::get(&url)
        .map_err(|e| format!("连接失败: {}", e))
        .and_then(|r| {
            if r.status().is_success() {
                Ok(())
            } else {
                Err(format!("返回状态码: {}", r.status()))
            }
        })
}

#[tauri::command]
pub fn flink_list_jars(flink_url: String) -> Result<Vec<JarInfo>, String> {
    let v = do_get(&flink_url, "/jars")?;
    let files = v["files"]
        .as_array()
        .ok_or("Unexpected /jars response: missing 'files' array")?;
    let mut jars = Vec::new();
    for f in files {
        jars.push(JarInfo {
            id: f["id"].as_str().unwrap_or("").to_string(),
            name: f["name"].as_str().unwrap_or("").to_string(),
            uploaded: f["uploaded"].as_i64(),
        });
    }
    Ok(jars)
}

#[tauri::command]
pub fn flink_upload_jar(flink_url: String, file_path: String) -> Result<String, String> {
    let url = format!("{}/jars/upload", flink_url.trim_end_matches('/'));
    let form = reqwest::blocking::multipart::Form::new()
        .file("jarfile", &file_path)
        .map_err(|e| format!("无法读取文件 {}: {}", file_path, e))?;
    let client = reqwest::blocking::Client::new();
    let resp = client
        .post(&url)
        .multipart(form)
        .send()
        .map_err(|e| format!("上传失败: {}", e))?;
    if resp.status().is_client_error() || resp.status().is_server_error() {
        return Err(format!(
            "上传返回 {}: {}",
            resp.status(),
            resp.text().unwrap_or_default()
        ));
    }
    let json: serde_json::Value = resp.json().map_err(|e| format!("解析失败: {}", e))?;
    if json["status"].as_str() == Some("success") {
        Ok(json["filename"].as_str().unwrap_or("").to_string())
    } else {
        Err(format!(
            "上传失败: {}",
            json["errors"].as_str().unwrap_or("unknown error")
        ))
    }
}

#[tauri::command]
pub fn flink_list_jobs(flink_url: String) -> Result<Vec<JobInfo>, String> {
    let v = do_get(&flink_url, "/jobs/overview")?;
    let jobs = v["jobs"]
        .as_array()
        .ok_or("Unexpected /jobs/overview response")?;
    let mut result = Vec::new();
    for j in jobs {
        result.push(JobInfo {
            id: j["jid"].as_str().unwrap_or("").to_string(),
            name: j["name"].as_str().unwrap_or("").to_string(),
            state: j["state"].as_str().unwrap_or("").to_string(),
            start_time: j["start-time"].as_i64(),
            end_time: j["end-time"].as_i64(),
        });
    }
    Ok(result)
}

#[tauri::command]
pub fn flink_cancel_job(flink_url: String, job_id: String) -> Result<(), String> {
    do_patch(&flink_url, &format!("/jobs/{}?mode=cancel", job_id))
}

#[tauri::command]
pub fn flink_trigger_savepoint(
    flink_url: String,
    job_id: String,
    cancel_job: bool,
) -> Result<String, String> {
    let body = serde_json::json!({"cancel-job": cancel_job});
    let res = do_post(
        &flink_url,
        &format!("/jobs/{}/savepoints", job_id),
        body,
    )?;
    Ok(res["request-id"].as_str().unwrap_or("").to_string())
}

#[tauri::command]
pub fn flink_get_savepoint_status(
    flink_url: String,
    job_id: String,
    trigger_id: String,
) -> Result<SavepointStatus, String> {
    let v = do_get(
        &flink_url,
        &format!("/jobs/{}/savepoints/{}", job_id, trigger_id),
    )?;
    let status_id = v["status"]["id"].as_str().unwrap_or("").to_string();
    let location = if status_id == "COMPLETED" {
        v["operation"]["location"].as_str().map(|s| s.to_string())
    } else {
        None
    };
    Ok(SavepointStatus {
        status: status_id,
        location,
    })
}

#[tauri::command]
pub fn flink_submit_job(
    flink_url: String,
    jar_id: String,
    entry_class: String,
    program_args: Vec<String>,
    savepoint_path: Option<String>,
) -> Result<String, String> {
    let body = serde_json::json!({
        "allowNonRestoredState": savepoint_path.is_some(),
        "parallelism": null,
        "entryClass": entry_class,
        "savepointPath": savepoint_path,
        "programArgsList": program_args,
    });
    let url = format!(
        "{}/jars/{}/run",
        flink_url.trim_end_matches('/'),
        jar_id
    );
    let client = reqwest::blocking::Client::new();
    let resp = client
        .post(&url)
        .json(&body)
        .send()
        .map_err(|e| format!("提交失败: {}", e))?;
    if resp.status().is_client_error() || resp.status().is_server_error() {
        return Err(format!(
            "提交返回 {}: {}",
            resp.status(),
            resp.text().unwrap_or_default()
        ));
    }
    let json: serde_json::Value = resp.json().map_err(|e| format!("解析失败: {}", e))?;
    Ok(json["jobid"].as_str().unwrap_or("").to_string())
}

// ---- File picker ----

#[tauri::command]
pub fn pick_jar_file() -> Result<String, String> {
    let path = rfd::FileDialog::new()
        .add_filter("Jar 文件", &["jar"])
        .pick_file()
        .ok_or_else(|| "用户取消选择".to_string())?;
    Ok(path.to_string_lossy().to_string())
}

// ---- Plugin config read/write ----

fn plugin_config_dir(plugin_id: &str) -> Result<std::path::PathBuf, String> {
    if plugin_id.contains('/') || plugin_id.contains('\\') || plugin_id.contains("..") {
        return Err("Invalid plugin id".to_string());
    }
    #[cfg(target_os = "windows")]
    let base = {
        std::env::var("APPDATA")
            .map(|s| std::path::PathBuf::from(s).join("deskpal").join("plugins"))
            .unwrap_or_else(|_| {
                std::path::PathBuf::from(r"C:\Users\Default\AppData\Roaming\deskpal\plugins")
            })
    };
    #[cfg(not(target_os = "windows"))]
    let base = {
        if let Ok(xdg) = std::env::var("XDG_CONFIG_HOME") {
            std::path::PathBuf::from(xdg)
                .join("deskpal")
                .join("plugins")
        } else if let Ok(home) = std::env::var("HOME") {
            std::path::PathBuf::from(home)
                .join(".config")
                .join("deskpal")
                .join("plugins")
        } else {
            std::path::PathBuf::from(".config/deskpal/plugins")
        }
    };
    let dir = base.join(plugin_id);
    if !dir.exists() {
        return Err(format!("Plugin '{}' directory not found", plugin_id));
    }
    Ok(dir)
}

#[tauri::command]
pub fn read_plugin_config(plugin_id: String) -> Result<String, String> {
    let dir = plugin_config_dir(&plugin_id)?;
    let config_path = dir.join("config.json");
    std::fs::read_to_string(&config_path).map_err(|e| format!("读取 config.json 失败: {}", e))
}

#[tauri::command]
pub fn write_plugin_config(plugin_id: String, config: String) -> Result<(), String> {
    let dir = plugin_config_dir(&plugin_id)?;
    let config_path = dir.join("config.json");
    // Validate JSON
    let _: serde_json::Value =
        serde_json::from_str(&config).map_err(|e| format!("JSON 格式错误: {}", e))?;
    std::fs::write(&config_path, &config).map_err(|e| format!("写入 config.json 失败: {}", e))
}
