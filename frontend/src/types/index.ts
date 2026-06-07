/**
 * SimulAgent 前端 TypeScript 类型定义
 *
 * 包含数据模型接口、WebSocket 消息联合类型和 REST API 响应类型，
 * 与后端 Pydantic/SQLAlchemy 模型和 contracts/ 协议保持一致。
 */

// ============================================================
// 数据模型（对应后端 models/*.py）
// ============================================================

/** 采集会话 */
export interface CaptureSession {
  id: string;
  title: string | null;
  source_language: string;
  target_language: string;
  display_mode: "bilingual" | "chinese_only";
  status: "active" | "paused" | "completed" | "error";
  audio_source: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  total_segments: number;
  created_at: string;
  updated_at: string;
}

/** 语音识别文本段 */
export interface TranscriptionSegment {
  id: string;
  session_id: string;
  sequence_number: number;
  source_text: string;
  start_time_ms: number;
  end_time_ms: number;
  confidence: number | null;
  is_partial: boolean;
  created_at: string;
}

/** 翻译修正记录 */
export interface RevisionEntry {
  timestamp: string;
  old_text: string;
  new_text: string;
  reason?: string;
}

/** 术语匹配记录 */
export interface TerminologyMatch {
  source_term: string;
  matched_translation: string;
  source_document?: string;
}

/** 翻译条目（含修正历史） */
export interface TranslationEntry {
  id: string;
  segment_id: string;
  session_id: string;
  sequence_number: number;
  source_text: string;
  translated_text: string;
  is_revised: boolean;
  revision_count: number;
  revision_history: RevisionEntry[];
  terminology_applied: TerminologyMatch[];
  start_time_ms: number;
  created_at: string;
}

/** 会话总结 */
export interface SessionSummary {
  id: string;
  session_id: string;
  abstract: string;
  key_viewpoints: string[];
  term_glossary: TermGlossaryItem[];
  action_items: ActionItem[];
  generated_at: string;
}

export interface TermGlossaryItem {
  term: string;
  translation: string;
  context?: string;
}

export interface ActionItem {
  item: string;
  assignee_context?: string;
  priority: "high" | "medium" | "low";
}

// ============================================================
// WebSocket 消息类型（参考 contracts/websocket.md）
// ============================================================

/** 服务端 → 客户端消息联合类型 */
export type ServerMessage =
  | { type: "connected"; session_id: string | null }
  | { type: "session_started"; session: CaptureSession }
  | { type: "asr_partial"; segment_id?: string; sequence_number?: number; text: string; is_final?: boolean; timestamp_ms?: number }
  | { type: "asr_final"; segment_id: string; sequence_number: number; text: string; confidence: number; start_time_ms: number; end_time_ms: number }
  | { type: "translation_token"; segment_id: string; token: string; token_index: number }
  | { type: "translation_complete"; segment_id: string; translation: string; terminology_applied: TerminologyMatch[] }
  | { type: "subtitle_entry"; entry: TranslationEntry }
  | { type: "revision"; entry_id: string; segment_id?: string; sequence_number?: number; old_translation: string; new_translation: string; reason: string }
  | { type: "session_status"; status: string; duration_seconds: number; total_segments: number }
  | { type: "session_ended"; session_id: string; duration_seconds: number; total_segments: number; ended_at: string }
  | { type: "summary_ready"; summary_id: string; abstract: string; key_viewpoints: string[]; term_glossary: TermGlossaryItem[]; action_items: ActionItem[] }
  | { type: "error"; code: string; message: string; recoverable: boolean };

/** 客户端 → 服务端消息联合类型 */
export type ClientMessage =
  | { type: "start_session"; config: { source_language: string; target_language: string; display_mode: string; title?: string; audio_source?: string; device_index?: number; glossary_terms?: Record<string, string> } }
  | { type: "stop_session" }
  | { type: "pause_session" }
  | { type: "resume_session" }
  | { type: "update_settings"; settings: Record<string, unknown> }
  | { type: "request_summary" };

// ============================================================
// REST API 响应类型（参考 contracts/api.md）
// ============================================================

export interface SessionListResponse {
  sessions: CaptureSession[];
  total: number;
}

export interface SubtitleListResponse {
  session_id: string;
  subtitles: TranslationEntry[];
  total: number;
}

export interface DocumentUploadResponse {
  document_id: string;
  filename: string;
  terms_extracted: number;
}

export interface HealthResponse {
  status: string;
  version: string;
}

/** 音频设备信息 */
export interface AudioDevice {
  name: string;
  index: number;
  max_input_channels: number;
  host_api: string;
}

export interface AudioDevicesResponse {
  default_loopback: AudioDevice | null;
  all_devices: AudioDevice[];
}
