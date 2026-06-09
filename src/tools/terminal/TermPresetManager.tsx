import { useState, useCallback, useRef, useEffect } from "react";
import type { TermPreset } from "../../types";
import { useStore } from "../../store";
import { useToast } from "../../store/toastStore";

interface TermPresetManagerProps {
  onClose: () => void;
  /** 新增时预填的命令（从主组件输入框传入） */
  prefillCmd?: string;
}

const presetIcon = "\u{1F4BB}"; // 💻
const noteIcon = "\u{1F4DD}";   // 📝

let _nextId = 1000;
function generateId(): string {
  return `preset-${++_nextId}-${Date.now()}`;
}

interface EditingForm {
  id: string;          // 空字符串表示新增
  label: string;
  cmd: string;
  note: string;
}

const emptyForm = (): EditingForm => ({ id: "", label: "", cmd: "", note: "" });

/** 判断 editingId 是否匹配已有的预设（即编辑现有预设而非新增） */
function isEditingExisting(editingId: string | null, presets: TermPreset[]): boolean {
  if (!editingId) return false;
  return presets.some((p) => p.id === editingId);
}

export default function TermPresetManager({ onClose, prefillCmd }: TermPresetManagerProps) {
  const presets = useStore((s) => s.terminalPresets);
  const setPresets = useStore((s) => s.setTerminalPresets);
  const toast = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditingForm>(emptyForm());
  const formRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭浮层
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  // Esc 关闭
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingId) {
          setEditingId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editingId, onClose]);

  // 有 prefillCmd 时自动打开新增表单（组件独立渲染不受 map 约束）
  useEffect(() => {
    if (prefillCmd) {
      const newId = generateId();
      setEditingId(newId);
      setForm({ id: newId, label: "", cmd: prefillCmd, note: "" });
    }
  }, [prefillCmd]);

  // 开始编辑现有预设
  const startEdit = useCallback((preset: TermPreset) => {
    setEditingId(preset.id);
    setForm({ id: preset.id, label: preset.label, cmd: preset.cmd, note: preset.note ?? "" });
  }, []);

  // 开始新增空白预设
  const startAdd = useCallback(() => {
    const newId = generateId();
    setEditingId(newId);
    setForm({ id: newId, label: "", cmd: "", note: "" });
  }, []);

  // 保存编辑/新增
  const handleSave = useCallback(() => {
    const trimmed = { label: form.label.trim(), cmd: form.cmd.trim(), note: form.note.trim() };
    if (!trimmed.label) { toast.show("请输入名称"); return; }
    if (!trimmed.cmd) { toast.show("请输入命令"); return; }

    if (isEditingExisting(form.id, presets)) {
      // 编辑已有
      const updated = presets.map((p) =>
        p.id === form.id
          ? { ...p, label: trimmed.label, cmd: trimmed.cmd, note: trimmed.note || undefined }
          : p
      );
      setPresets(updated);
    } else {
      // 新增
      const newPreset: TermPreset = {
        id: form.id || generateId(),
        label: trimmed.label,
        cmd: trimmed.cmd,
        note: trimmed.note || undefined,
      };
      setPresets([...presets, newPreset]);
    }
    setEditingId(null);
    toast.show("已保存");
  }, [form, presets, setPresets, toast]);

  // 删除
  const handleDelete = useCallback((id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    if (editingId === id) setEditingId(null);
    toast.show("已删除");
  }, [presets, setPresets, editingId, toast]);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  // Ctrl+Enter 保存
  const handleFormKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  const isNewForm = editingId !== null && !isEditingExisting(editingId, presets);

  return (
    <div className="tpm-overlay" onClick={handleBackdropClick}>
      <div className="tpm-modal">
        {/* Header */}
        <div className="tpm-header">
          <span className="tpm-title">预设命令管理</span>
          <button className="tpm-close-btn" onClick={onClose} title="关闭">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="tpm-body">
          {presets.length === 0 && !isNewForm && (
            <div className="tpm-empty">
              暂无预设命令，点击下方按钮添加
            </div>
          )}

          {/* ⭐ 新增预设的编辑表单 — 独立于 presets.map，不依赖 ID 匹配 */}
          {isNewForm && (
            <div className="tpm-card editing">
              <div className="tpm-form" ref={formRef} onKeyDown={handleFormKeyDown}>
                <div className="tpm-form-field">
                  <label>名称</label>
                  <input
                    className="tpm-input"
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="按钮显示名称"
                    autoFocus
                  />
                </div>
                <div className="tpm-form-field">
                  <label>命令</label>
                  <input
                    className="tpm-input tpm-input-mono"
                    value={form.cmd}
                    onChange={(e) => setForm((f) => ({ ...f, cmd: e.target.value }))}
                    placeholder="要执行的命令"
                  />
                </div>
                <div className="tpm-form-field">
                  <label>注释</label>
                  <input
                    className="tpm-input"
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="可选注释说明"
                  />
                </div>
                <div className="tpm-form-actions">
                  <button className="tpm-btn" onClick={handleCancelEdit}>取消</button>
                  <button className="tpm-btn tpm-btn-primary" onClick={handleSave}>保存</button>
                </div>
              </div>
            </div>
          )}

          {/* 已有预设卡片 */}
          {presets.map((preset) => (
            <div key={preset.id} className={`tpm-card ${editingId === preset.id ? "editing" : ""}`}>
              {editingId === preset.id ? (
                /* 编辑已有预设 */
                <div className="tpm-form" ref={formRef} onKeyDown={handleFormKeyDown}>
                  <div className="tpm-form-field">
                    <label>名称</label>
                    <input
                      className="tpm-input"
                      value={form.label}
                      onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                      placeholder="按钮显示名称"
                      autoFocus
                    />
                  </div>
                  <div className="tpm-form-field">
                    <label>命令</label>
                    <input
                      className="tpm-input tpm-input-mono"
                      value={form.cmd}
                      onChange={(e) => setForm((f) => ({ ...f, cmd: e.target.value }))}
                      placeholder="要执行的命令"
                    />
                  </div>
                  <div className="tpm-form-field">
                    <label>注释</label>
                    <input
                      className="tpm-input"
                      value={form.note}
                      onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                      placeholder="可选注释说明"
                    />
                  </div>
                  <div className="tpm-form-actions">
                    <button className="tpm-btn" onClick={handleCancelEdit}>取消</button>
                    <button className="tpm-btn tpm-btn-primary" onClick={handleSave}>保存</button>
                  </div>
                </div>
              ) : (
                /* 展示态 */
                <>
                  <div className="tpm-card-header">
                    <span className="tpm-card-label">{preset.label}</span>
                    <div className="tpm-card-actions">
                      <button
                        className="tpm-btn-sm"
                        onClick={() => startEdit(preset)}
                        title="编辑"
                      >
                        ✏ 编辑
                      </button>
                      <button
                        className="tpm-btn-sm tpm-btn-sm-danger"
                        onClick={() => handleDelete(preset.id)}
                        title="删除"
                      >
                        🗑 删除
                      </button>
                    </div>
                  </div>
                  <div className="tpm-card-cmd">
                    <span className="tpm-card-icon">{presetIcon}</span>
                    <code>{preset.cmd}</code>
                  </div>
                  {preset.note && (
                    <div className="tpm-card-note">
                      <span className="tpm-card-icon">{noteIcon}</span>
                      <span>{preset.note}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {/* 添加按钮 — 无任何编辑/新增进行中时才显示 */}
          {!editingId && (
            <button className="tpm-add-btn" onClick={startAdd}>
              ➕ 添加预设
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
