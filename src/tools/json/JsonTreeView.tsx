import { useState, useCallback, useImperativeHandle, forwardRef, memo } from "react";
import { useToast } from "../../store/toastStore";

// ── Types ──

export interface JsonTreeViewHandle {
  collapseAll: () => void;
  expandAll: () => void;
}

interface JsonTreeViewProps {
  data: unknown;
  defaultExpandedDepth?: number;
}

// ── Helpers ──

function collectPaths(
  data: unknown,
  prefix: string,
  set: Set<string>,
  depth: number,
  maxDepth: number,
) {
  if (depth >= maxDepth) return;
  if (data === null || typeof data !== "object") return;
  set.add(prefix);
  if (Array.isArray(data)) {
    data.forEach((item, i) =>
      collectPaths(item, `${prefix}[${i}]`, set, depth + 1, maxDepth),
    );
  } else {
    Object.entries(data as Record<string, unknown>).forEach(([k, v]) =>
      collectPaths(
        v,
        prefix ? `${prefix}.${k}` : k,
        set,
        depth + 1,
        maxDepth,
      ),
    );
  }
}

function formatValue(val: unknown): string {
  if (val === null) return "null";
  if (typeof val === "string") return `"${val}"`;
  return String(val);
}

function valueType(val: unknown): string {
  if (val === null) return "null";
  return typeof val;
}

function copyValue(val: unknown) {
  const text = typeof val === "string" ? val : JSON.stringify(val);
  navigator.clipboard.writeText(text).then(() => {
    useToast.getState().show("已复制");
  }).catch(() => {});
}

// ── JsonNode (memoized recursive component) ──

interface JsonNodeProps {
  value: unknown;
  path: string;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  isLast: boolean;
}

const JsonNode = memo(function JsonNode({
  value,
  path,
  depth,
  expanded,
  onToggle,
  isLast,
}: JsonNodeProps) {
  const isContainer = value !== null && typeof value === "object";
  const isExpanded = expanded.has(path);

  if (!isContainer) {
    // Leaf node
    return (
      <div
        className="jv-node"
        style={{ paddingLeft: depth * 16 }}
        onClick={() => copyValue(value)}
      >
        <span className={`jv-value jv-${valueType(value)}`}>
          {formatValue(value)}
        </span>
        {!isLast && <span className="jv-sep">,</span>}
      </div>
    );
  }

  // Container node: object or array
  const entries = Array.isArray(value)
    ? value.map((v, i) => ({
        key: String(i),
        value: v,
        path: `${path}[${i}]`,
      }))
    : Object.entries(value as Record<string, unknown>).map(([k, v]) => ({
        key: k,
        value: v,
        path: path ? `${path}.${k}` : k,
      }));

  const toggle = () => onToggle(path);
  const bracket = Array.isArray(value) ? "[" : "{";
  const closeBracket = Array.isArray(value) ? "]" : "}";

  return (
    <div>
      <div
        className="jv-node"
        style={{ paddingLeft: depth * 16 }}
        onClick={toggle}
      >
        <span className="jv-toggle">{isExpanded ? "▼" : "▶"}</span>
        {!isExpanded && (
          <span className="jv-collapsed">
            {bracket}
            {entries.length}
            {closeBracket}
          </span>
        )}
      </div>
      {isExpanded && (
        <div>
          {entries.map((entry, i) => (
            <JsonNode
              key={entry.path}
              value={entry.value}
              path={entry.path}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              isLast={i === entries.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// ── Main Component ──

const JsonTreeView = forwardRef<JsonTreeViewHandle, JsonTreeViewProps>(
  ({ data, defaultExpandedDepth = 2 }, ref) => {
    const [expanded, setExpanded] = useState<Set<string>>(() => {
      const s = new Set<string>();
      collectPaths(data, "", s, 0, defaultExpandedDepth);
      return s;
    });

    useImperativeHandle(ref, () => ({
      collapseAll: () => setExpanded(new Set()),
      expandAll: () => {
        const s = new Set<string>();
        collectPaths(data, "", s, 0, Infinity);
        setExpanded(s);
      },
    }));

    const handleToggle = useCallback((path: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        return next;
      });
    }, []);

    const entries = Array.isArray(data)
      ? data.map((v, i) => ({
          key: String(i),
          value: v,
          path: `[${i}]`,
        }))
      : Object.entries(data as Record<string, unknown>).map(([k, v]) => ({
          key: k,
          value: v,
          path: k,
        }));

    return (
      <div className="jv-tree">
        {entries.map((entry, i) => (
          <JsonNode
            key={entry.path}
            value={entry.value}
            path={entry.path}
            depth={0}
            expanded={expanded}
            onToggle={handleToggle}
            isLast={i === entries.length - 1}
          />
        ))}
      </div>
    );
  },
);

JsonTreeView.displayName = "JsonTreeView";

export default JsonTreeView;
