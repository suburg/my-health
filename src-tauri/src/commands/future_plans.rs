use serde::{Deserialize, Serialize};

use crate::storage;
use crate::storage::future_plan_store::FuturePlan;

// ============================================================================
// Request / Response типы
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct AddFuturePlanRequest {
    pub plan: PlanInput,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PlanInput {
    pub id: String,
    pub plan_type: String,
    pub planned_date: String,
    pub is_mandatory: bool,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateFuturePlanRequest {
    pub id: String,
    pub plan: PlanUpdate,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanUpdate {
    pub plan_type: Option<String>,
    pub planned_date: Option<String>,
    pub is_mandatory: Option<bool>,
    pub description: Option<Option<String>>,
    pub status: Option<String>,
    pub completed_date: Option<Option<String>>,
    pub cancel_reason: Option<Option<String>>,
}

#[derive(Debug, Deserialize)]
pub struct DeleteFuturePlanRequest {
    pub id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompleteFuturePlanRequest {
    pub id: String,
    pub completed_date: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CancelFuturePlanRequest {
    pub id: String,
    pub cancel_reason: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct DeleteResponse {
    pub success: bool,
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Загрузить все плановые задачи.
#[tauri::command]
pub fn get_future_plans(app: tauri::AppHandle) -> Result<Vec<FuturePlan>, String> {
    let plans = storage::future_plan_store::load_future_plans(&app)
        .map_err(|e| format!("Ошибка чтения future-plans.json: {e}"))?;
    Ok(plans)
}

/// Добавить новую плановую задачу с валидацией обязательных полей.
#[tauri::command]
pub fn add_future_plan(
    app: tauri::AppHandle,
    plan: PlanInput,
) -> Result<FuturePlan, String> {
    // Валидация обязательных полей
    if plan.plan_type.is_empty() {
        return Err("Вид задачи обязателен".into());
    }
    if !matches!(plan.plan_type.as_str(), "appointment" | "labTest" | "research") {
        return Err("Недопустимый вид задачи. Допустимые: appointment, labTest, research".into());
    }
    if plan.planned_date.is_empty() {
        return Err("Плановая дата обязательна".into());
    }
    if let Some(ref desc) = plan.description {
        if desc.len() > 500 {
            return Err("Описание не более 500 символов".into());
        }
    }

    let now = chrono::Utc::now().to_rfc3339();
    let new_plan = FuturePlan {
        id: plan.id,
        plan_type: plan.plan_type,
        planned_date: plan.planned_date,
        is_mandatory: plan.is_mandatory,
        description: plan.description,
        status: "planned".to_string(),
        completed_date: None,
        cancel_reason: None,
        created_at: now.clone(),
        updated_at: now,
    };

    let mut plans = storage::future_plan_store::load_future_plans(&app)
        .map_err(|e| format!("Ошибка чтения future-plans.json: {e}"))?;

    if let Some(pos) = plans.iter().position(|p| p.id == new_plan.id) {
        plans[pos] = new_plan.clone();
    } else {
        plans.push(new_plan.clone());
    }

    // Сортировка по плановой дате ASC (ближайшие сверху)
    plans.sort_by(|a, b| a.planned_date.cmp(&b.planned_date));

    storage::future_plan_store::save_future_plans(&app, &plans)
        .map_err(|e| format!("Ошибка записи future-plans.json: {e}"))?;

    Ok(new_plan)
}

/// Обновить существующую плановую задачу.
#[tauri::command]
pub fn update_future_plan(
    app: tauri::AppHandle,
    id: String,
    plan: PlanUpdate,
) -> Result<FuturePlan, String> {
    let mut plans = storage::future_plan_store::load_future_plans(&app)
        .map_err(|e| format!("Ошибка чтения future-plans.json: {e}"))?;

    let pos = plans
        .iter()
        .position(|p| p.id == id)
        .ok_or_else(|| format!("Задача с id '{}' не найдена", id))?;

    if let Some(v) = &plan.plan_type {
        if !matches!(v.as_str(), "appointment" | "labTest" | "research") {
            return Err("Недопустимый вид задачи".into());
        }
        plans[pos].plan_type = v.clone();
    }
    if let Some(v) = &plan.planned_date {
        if v.is_empty() {
            return Err("Плановая дата не может быть пустой".into());
        }
        plans[pos].planned_date = v.clone();
    }
    if let Some(v) = plan.is_mandatory {
        plans[pos].is_mandatory = v;
    }
    if let Some(v) = &plan.description {
        if let Some(ref desc) = v {
            if desc.len() > 500 {
                return Err("Описание не более 500 символов".into());
            }
        }
        plans[pos].description = v.clone();
    }
    if let Some(v) = &plan.status {
        // При смене статуса на planned — очищаем специфичные поля
        if v == "planned" {
            plans[pos].completed_date = None;
            plans[pos].cancel_reason = None;
        }
        plans[pos].status = v.clone();
    }
    if let Some(v) = &plan.completed_date {
        plans[pos].completed_date = v.clone();
    }
    if let Some(v) = &plan.cancel_reason {
        plans[pos].cancel_reason = v.clone();
    }

    plans[pos].updated_at = chrono::Utc::now().to_rfc3339();
    let result = plans[pos].clone();
    plans.sort_by(|a, b| a.planned_date.cmp(&b.planned_date));

    storage::future_plan_store::save_future_plans(&app, &plans)
        .map_err(|e| format!("Ошибка записи future-plans.json: {e}"))?;

    Ok(result)
}

/// Удалить плановую задачу по ID.
#[tauri::command]
pub fn delete_future_plan(
    app: tauri::AppHandle,
    id: String,
) -> Result<DeleteResponse, String> {
    let mut plans = storage::future_plan_store::load_future_plans(&app)
        .map_err(|e| format!("Ошибка чтения future-plans.json: {e}"))?;

    let len_before = plans.len();
    plans.retain(|p| p.id != id);

    if plans.len() == len_before {
        return Err(format!("Задача с id '{}' не найдена", id));
    }

    storage::future_plan_store::save_future_plans(&app, &plans)
        .map_err(|e| format!("Ошибка записи future-plans.json: {e}"))?;

    Ok(DeleteResponse { success: true })
}

/// Отметить задачу как «Выполнено» с фактической датой.
#[tauri::command]
pub fn complete_future_plan(
    app: tauri::AppHandle,
    id: String,
    completed_date: String,
) -> Result<FuturePlan, String> {
    let mut plans = storage::future_plan_store::load_future_plans(&app)
        .map_err(|e| format!("Ошибка чтения future-plans.json: {e}"))?;

    let pos = plans
        .iter()
        .position(|p| p.id == id)
        .ok_or_else(|| format!("Задача с id '{}' не найдена", id))?;

    // FR-014: только planned → completed
    if plans[pos].status != "planned" {
        return Err(format!(
            "Нельзя выполнить задачу со статусом «{}». Задача должна быть в статусе «Запланировано»",
            plans[pos].status
        ));
    }

    plans[pos].status = "completed".to_string();
    plans[pos].completed_date = Some(completed_date);
    plans[pos].cancel_reason = None;
    plans[pos].updated_at = chrono::Utc::now().to_rfc3339();
    let result = plans[pos].clone();

    storage::future_plan_store::save_future_plans(&app, &plans)
        .map_err(|e| format!("Ошибка записи future-plans.json: {e}"))?;

    Ok(result)
}

/// Отметить задачу как «Отменено» с опциональной причиной.
#[tauri::command]
pub fn cancel_future_plan(
    app: tauri::AppHandle,
    id: String,
    cancel_reason: Option<String>,
) -> Result<FuturePlan, String> {
    let mut plans = storage::future_plan_store::load_future_plans(&app)
        .map_err(|e| format!("Ошибка чтения future-plans.json: {e}"))?;

    let pos = plans
        .iter()
        .position(|p| p.id == id)
        .ok_or_else(|| format!("Задача с id '{}' не найдена", id))?;

    // FR-014: только planned → cancelled
    if plans[pos].status != "planned" {
        return Err(format!(
            "Нельзя отменить задачу со статусом «{}». Задача должна быть в статусе «Запланировано»",
            plans[pos].status
        ));
    }

    if let Some(ref reason) = cancel_reason {
        if reason.len() > 300 {
            return Err("Причина отмены не более 300 символов".into());
        }
    }

    plans[pos].status = "cancelled".to_string();
    plans[pos].cancel_reason = cancel_reason;
    plans[pos].completed_date = None;
    plans[pos].updated_at = chrono::Utc::now().to_rfc3339();
    let result = plans[pos].clone();

    storage::future_plan_store::save_future_plans(&app, &plans)
        .map_err(|e| format!("Ошибка записи future-plans.json: {e}"))?;

    Ok(result)
}
