/*
 * Copyright (c) 2024-2026 Sun Booshi
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import { useState, useCallback } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  ChevronRightIcon,
  ChevronDownIcon,
  CopyIcon,
  CheckIcon,
  ExternalLinkIcon,
  ImageIcon,
  ExclamationTriangleIcon,
  Cross2Icon,
  DownloadIcon,
} from "@radix-ui/react-icons";
import { Notice, requestUrl } from "obsidian";
import { usePluginStore } from "../../store/PluginStore";
import { mimeToImageExt } from "../../utils";

// ─── 类型 ────────────────────────────────────────────────────────────────────

type JsonValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface JSONViewerProps {
  /** 工作流返回的原始数据，任意结构 */
  data: JsonValue;
  /** 默认展开深度，默认 2 */
  defaultDepth?: number;
  /** 组件根节点额外 className */
  className?: string;
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

const IMAGE_KEY_RE =
  /^(image|img|avatar|thumbnail|photo|picture|cover|banner|icon|poster|logo|src|url)s?$/i;
const IMAGE_URL_RE = /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?.*)?$/i;
const BASE64_RE = /^data:image\//i;
const URL_RE = /^https?:\/\/.+/i;

function isImageValue(key: string, value: string): boolean {
  if (BASE64_RE.test(value)) return true;
  if (IMAGE_URL_RE.test(value)) return true;
  if (IMAGE_KEY_RE.test(key) && URL_RE.test(value)) return true;
  return false;
}

function isUrlValue(value: string): boolean {
  return URL_RE.test(value);
}

function getType(value: JsonValue): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function getCollapsedPreview(value: JsonValue): string {
  if (Array.isArray(value)) return `${value.length} items`;
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value);
    const preview = keys.slice(0, 3).join(", ");
    return keys.length > 3 ? `${preview}, …` : preview;
  }
  return "";
}

// ─── 图片预览 Dialog ──────────────────────────────────────────────────────────

function ImagePreviewDialog({
  url,
  open,
  onOpenChange,
}: {
  url: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveImage = useCallback(async () => {
    const app = usePluginStore.getState().app;
    if (!app) return;

    setSaving(true);
    try {
      let data: ArrayBuffer;
      let extension = ".png";

      if (url.startsWith("data:")) {
        const parts = url.split(",");
        if (parts.length !== 2) throw new Error("无效的 base64 图片数据");
        const mime = parts[0].match(/:(.*?);/)?.[1] || "image/png";
        extension = mimeToImageExt(mime);
        const binary = atob(parts[1]);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        data = bytes.buffer;
      } else {
        const response = await requestUrl({ url });
        data = response.arrayBuffer;
        const mime = response.headers["content-type"] || "image/png";
        extension = mimeToImageExt(mime);
      }

      const filename = `image_${Date.now()}${extension}`;
      // @ts-ignore
      const attachmentFolderPath = app.vault.getConfig("attachmentFolderPath");
      const path = `${attachmentFolderPath}/${filename}`;
      await app.vault.createBinary(path, data);
      new Notice(`图片已保存到: ${path}`, 5000);
    } catch (error) {
      console.error(error);
      new Notice(`保存图片失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  }, [url]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            zIndex: "calc(var(--layer-modal) + 1)",
            backgroundColor: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
            animation: "jv-fadeIn 150ms ease",
          }}
        />
        <Dialog.Content
          style={{
            position: "fixed",
            inset: 0,
            zIndex: "calc(var(--layer-modal) + 2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
          onPointerDownOutside={() => onOpenChange(false)}
        >
          <Dialog.Title></Dialog.Title>
          <Dialog.Description></Dialog.Description>
          <div
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "90vh",
              borderRadius: "8px",
              overflow: "hidden",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "var(--background-secondary)",
              animation: "jv-scaleIn 150ms ease",
            }}
          >
            {imgError ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px",
                  padding: "40px 48px",
                  color: "var(--text-muted)",
                }}
              >
                <ExclamationTriangleIcon width={32} height={32} />
                <span style={{ fontSize: "13px" }}>图片加载失败</span>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    color: "var(--interactive-accent)",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.textDecoration = "underline")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.textDecoration = "none")
                  }
                >
                  在浏览器中打开 <ExternalLinkIcon width={12} height={12} />
                </a>
              </div>
            ) : (
              <img
                src={url}
                alt="preview"
                style={{
                  display: "block",
                  maxWidth: "90vw",
                  maxHeight: "85vh",
                  objectFit: "contain",
                }}
                onError={() => setImgError(true)}
              />
            )}

            {!imgError && (
              <Tooltip.Provider delayDuration={300}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      onClick={handleSaveImage}
                      disabled={saving}
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "44px",
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        border: "none",
                        backgroundColor: "rgba(0,0,0,0.6)",
                        color: "#fff",
                        cursor: saving ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background-color 150ms",
                        opacity: saving ? 0.7 : 1,
                      }}
                      onMouseEnter={(e) =>
                        !saving && ((e.currentTarget as HTMLElement).style.backgroundColor = "rgba(0,0,0,0.85)")
                      }
                      onMouseLeave={(e) =>
                        !saving && ((e.currentTarget as HTMLElement).style.backgroundColor = "rgba(0,0,0,0.6)")
                      }
                      aria-label="保存到仓库"
                    >
                      <DownloadIcon
                        width={14}
                        height={14}
                        style={{
                          flexShrink: 0,
                          animation: saving ? "jv-spin 1s linear infinite" : "none"
                        }}
                      />
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="bottom"
                      sideOffset={4}
                      style={{
                        backgroundColor: "var(--background-modifier-border)",
                        color: "var(--text-normal)",
                        borderRadius: "4px",
                        padding: "3px 8px",
                        fontSize: "11px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                        zIndex: 10002,
                      }}
                    >
                      保存到仓库
                      <Tooltip.Arrow style={{ fill: "var(--background-modifier-border)" }} />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            )}

            <Dialog.Close asChild>
              <button
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  border: "none",
                  backgroundColor: "rgba(0,0,0,0.6)",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background-color 150ms",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.backgroundColor = "rgba(0,0,0,0.85)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.backgroundColor = "rgba(0,0,0,0.6)")
                }
                aria-label="关闭预览"
              >
                <Cross2Icon width={14} height={14} style={{flexShrink:0}}/>
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── 字符串值渲染 ──────────────────────────────────────────────────────────────

function StringValue({ nodeKey, value }: { nodeKey: string; value: string }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  if (isImageValue(nodeKey, value)) {
    return (
      <>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              color: "var(--color-green)",
              fontFamily: "monospace",
              fontSize: "11px",
              wordBreak: "break-all",
            }}
          >
            &quot;{value.length > 60 ? value.slice(0, 60) + "…" : value}&quot;
          </span>

          <button
            onClick={() => setPreviewOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              padding: "1px 6px",
              borderRadius: "4px",
              fontSize: "10px",
              fontWeight: 500,
              border: "1px solid color-mix(in srgb, var(--interactive-accent) 35%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--interactive-accent) 12%, transparent)",
              color: "var(--interactive-accent)",
              cursor: "pointer",
              transition: "background-color 150ms",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.backgroundColor =
                "color-mix(in srgb, var(--interactive-accent) 22%, transparent)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.backgroundColor =
                "color-mix(in srgb, var(--interactive-accent) 12%, transparent)")
            }
          >
            <ImageIcon width={10} height={10} />
            预览
          </button>
        </span>

        <ImagePreviewDialog
          url={value}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      </>
    );
  }

  if (isUrlValue(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          fontFamily: "monospace",
          fontSize: "11px",
          color: "var(--interactive-accent)",
          textDecoration: "none",
          wordBreak: "break-all",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.textDecoration = "underline")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.textDecoration = "none")
        }
      >
        &quot;{value}&quot;
        <ExternalLinkIcon width={11} height={11} style={{ flexShrink: 0 }} />
      </a>
    );
  }

  if (value.length > 120) {
    return <LongString value={value} />;
  }

  return (
    <span
      style={{
        color: "var(--color-green)",
        fontFamily: "monospace",
        fontSize: "11px",
        wordBreak: "break-all",
      }}
    >
      &quot;{value}&quot;
    </span>
  );
}

function LongString({ value }: { value: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <span
      style={{
        color: "var(--color-green)",
        fontFamily: "monospace",
        fontSize: "11px",
        wordBreak: "break-all",
      }}
    >
      &quot;{expanded ? value : value.slice(0, 120)}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          marginLeft: "4px",
          color: "var(--text-muted)",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontSize: "10px",
          textDecoration: "underline",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.color = "var(--text-normal)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")
        }
      >
        {expanded ? "收起" : `…+${value.length - 120}字符`}
      </button>
      &quot;
    </span>
  );
}

// ─── 单个节点 ─────────────────────────────────────────────────────────────────

interface NodeProps {
  nodeKey: string;
  value: JsonValue;
  depth: number;
  defaultDepth: number;
  isLast: boolean;
}

function JsonNode({ nodeKey, value, depth, defaultDepth, isLast }: NodeProps) {
  const type = getType(value);
  const isExpandable = type === "object" || type === "array";
  const [open, setOpen] = useState(depth < defaultDepth);

  const comma = !isLast && (
    <span
      style={{
        color: "var(--text-muted)",
        fontFamily: "monospace",
        fontSize: "11px",
      }}
    >
      ,
    </span>
  );

  const keyLabel = nodeKey !== "" && (
    <span style={{ fontFamily: "monospace", fontSize: "11px", flexShrink: 0 }}>
      <span style={{ color: "var(--color-purple)" }}>&quot;{nodeKey}&quot;</span>
      <span style={{ color: "var(--text-muted)", margin: "0 2px" }}>:</span>
    </span>
  );

  // ── 可折叠节点 ──
  if (isExpandable) {
    const isArr = type === "array";
    const entries = isArr
      ? (value as JsonValue[]).map((v, i) => [String(i), v] as [string, JsonValue])
      : Object.entries(value as Record<string, JsonValue>);
    const [openBracket, closeBracket] = isArr ? ["[", "]"] : ["{", "}"];

    return (
      <Collapsible.Root open={open} onOpenChange={setOpen}>
        <Collapsible.Trigger asChild>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              cursor: "pointer",
              borderRadius: "4px",
              padding: "1px 4px",
              margin: "0 -4px",
              userSelect: "none",
              transition: "background-color 100ms",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.backgroundColor =
                "var(--background-modifier-hover)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
            }
          >
            <span
              style={{
                color: "var(--text-muted)",
                width: "14px",
                height: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {open ? <ChevronDownIcon width={12} height={12} /> : <ChevronRightIcon width={12} height={12} />}
            </span>

            {keyLabel}

            <span
              style={{
                color: "var(--text-muted)",
                fontFamily: "monospace",
                fontSize: "11px",
              }}
            >
              {openBracket}
            </span>

            {!open && (
              <>
                <span
                  style={{
                    color: "var(--text-faint)",
                    fontFamily: "monospace",
                    fontSize: "10px",
                    marginLeft: "4px",
                  }}
                >
                  {getCollapsedPreview(value)}
                </span>
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "monospace",
                    fontSize: "11px",
                    marginLeft: "2px",
                  }}
                >
                  {closeBracket}
                </span>
                {comma}
              </>
            )}
          </div>
        </Collapsible.Trigger>

        <Collapsible.Content>
          <div
            style={{
              marginLeft: "16px",
              paddingLeft: "12px",
              borderLeft: "1px solid var(--background-modifier-border)",
              marginTop: "2px",
            }}
          >
            {entries.map(([k, v], idx) => (
              <JsonNode
                key={k}
                nodeKey={k}
                value={v}
                depth={depth + 1}
                defaultDepth={defaultDepth}
                isLast={idx === entries.length - 1}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              paddingLeft: "18px",
            }}
          >
            <span
              style={{
                color: "var(--text-muted)",
                fontFamily: "monospace",
                fontSize: "11px",
              }}
            >
              {closeBracket}
            </span>
            {comma}
          </div>
        </Collapsible.Content>
      </Collapsible.Root>
    );
  }

  // ── 叶子节点 ──
  let valueEl: React.ReactNode = null;

  if (type === "null" || type === "undefined") {
    valueEl = (
      <span
        style={{
          color: "var(--text-faint)",
          fontFamily: "monospace",
          fontSize: "11px",
          fontStyle: "italic",
        }}
      >
        {type}
      </span>
    );
  } else if (type === "boolean") {
    valueEl = (
      <span
        style={{
          color: "var(--color-orange)",
          fontFamily: "monospace",
          fontSize: "11px",
        }}
      >
        {String(value)}
      </span>
    );
  } else if (type === "number") {
    valueEl = (
      <span
        style={{
          color: "var(--color-blue)",
          fontFamily: "monospace",
          fontSize: "11px",
        }}
      >
        {String(value)}
      </span>
    );
  } else if (type === "string") {
    valueEl = <StringValue nodeKey={nodeKey} value={value as string} />;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "2px",
        padding: "2px 4px",
        margin: "0 -4px",
        borderRadius: "4px",
        transition: "background-color 100ms",
        lineHeight: "1.5",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.backgroundColor =
          "var(--background-modifier-hover)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
      }
    >
      <span style={{ width: "14px", flexShrink: 0 }} />
      {keyLabel}
      {valueEl}
      {comma}
    </div>
  );
}

// ─── 复制按钮（带 Tooltip） ───────────────────────────────────────────────────

function CopyButton({ data }: { data: JsonValue }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [data]);

  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            onClick={handleCopy}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "3px 8px",
              borderRadius: "5px",
              fontSize: "11px",
              fontWeight: 500,
              border: "1px solid transparent",
              backgroundColor: "transparent",
              color: copied ? "var(--color-green)" : "var(--text-muted)",
              cursor: "pointer",
              transition: "all 150ms",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.color = "var(--text-normal)";
              el.style.backgroundColor = "var(--background-modifier-hover)";
              el.style.borderColor = "var(--background-modifier-border)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.color = copied ? "var(--color-green)" : "var(--text-muted)";
              el.style.backgroundColor = "transparent";
              el.style.borderColor = "transparent";
            }}
          >
            {copied ? (
              <>
                <CheckIcon width={13} height={13} style={{ color: "var(--color-green)" }} />
                <span style={{ color: "var(--color-green)" }}>已复制</span>
              </>
            ) : (
              <>
                <CopyIcon width={13} height={13} />
                <span>复制</span>
              </>
            )}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="left"
            sideOffset={6}
            style={{
              backgroundColor: "var(--background-modifier-border)",
              color: "var(--text-normal)",
              borderRadius: "4px",
              padding: "3px 8px",
              fontSize: "11px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
              zIndex: 9999,
            }}
          >
            复制为 JSON
            <Tooltip.Arrow style={{ fill: "var(--background-modifier-border)" }} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export function ResultViewer({ data, defaultDepth = 2, className }: JSONViewerProps) {
  const type = getType(data);
  const isExpandable = type === "object" || type === "array";

  const stats = (() => {
    if (type === "array") return `${(data as JsonValue[]).length} items`;
    if (type === "object") return `${Object.keys(data as object).length} keys`;
    return type;
  })();

  const rootEntries = isExpandable
    ? type === "array"
      ? (data as JsonValue[]).map((v, i) => [String(i), v] as [string, JsonValue])
      : Object.entries(data as Record<string, JsonValue>)
    : null;

  return (
    <>
      <style>{`
        @keyframes jv-fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes jv-scaleIn { from { opacity: 0; transform: scale(.96) } to { opacity: 1; transform: scale(1) } }
        @keyframes jv-spin    { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>

      <div
        className={className}
        style={{
          borderRadius: "8px",
          border: "1px solid var(--background-modifier-border)",
          backgroundColor: "var(--background-primary)",
          color: "var(--text-normal)",
          overflow: "hidden",
        }}
      >
        {/* 工具栏 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 12px",
            borderBottom: "1px solid var(--background-modifier-border)",
            backgroundColor: "var(--background-secondary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              Result
            </span>
            <span
              style={{
                padding: "1px 6px",
                borderRadius: "4px",
                fontSize: "10px",
                fontFamily: "monospace",
                backgroundColor: "var(--background-modifier-border)",
                color: "var(--text-faint)",
              }}
            >
              {stats}
            </span>
          </div>
          <CopyButton data={data} />
        </div>

        {/* 内容区 */}
        <div
          style={{
            padding: "10px 12px",
            overflowY: "auto",
            maxHeight: "60vh",
            lineHeight: "1.6",
          }}
        >
          {rootEntries ? (
            <div>
              {rootEntries.map(([k, v], idx) => (
                <JsonNode
                  key={k}
                  nodeKey={k}
                  value={v}
                  depth={1}
                  defaultDepth={defaultDepth}
                  isLast={idx === rootEntries.length - 1}
                />
              ))}
            </div>
          ) : (
            <JsonNode
              nodeKey=""
              value={data}
              depth={0}
              defaultDepth={defaultDepth}
              isLast
            />
          )}
        </div>
      </div>
    </>
  );
}
