"use client";

/**
 * Ordered image-URL list editor, ported from the redesign admin
 * (skyball-web/apps/admin/lib/image-list-editor.tsx). Each image is a row:
 * thumbnail preview, editable URL, move up/down (or drag the row by its
 * handle), remove. The value stays a plain `string[]` of URLs, so the API
 * payload is exactly what `products.images` stores.
 *
 * Previews are plain <img> tags: the admin CSP (next.config.mjs) allows the
 * S3 bucket host; anything else shows "can't load". Rows whose host the
 * public site can't render (ALLOWED_IMAGE_HOSTS) get an inline warning.
 */
import { useState } from "react";

import { cn } from "@/lib/utils";
import { imageHostAllowed } from "@/lib/product-admin";

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:bg-gray-50 disabled:text-gray-500";

function Thumb({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const box = "h-16 w-16 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100";
  if (!url.trim() || failed) {
    return (
      <div
        className={cn(
          box,
          "flex items-center justify-center text-center text-[10px] text-gray-500",
        )}
      >
        {url.trim() ? "can't load" : "no URL"}
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={box} title="Open full size">
      {/* Plain <img>: arbitrary remote hosts, admin-only preview. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        loading="lazy"
        draggable={false}
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    </a>
  );
}

export default function ImageListEditor({
  id,
  value,
  onChange,
  disabled = false,
  emptyText = "No images yet.",
}: {
  /** Put on the "add" input so a `<label htmlFor>` focuses it. */
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  emptyText?: string;
}) {
  const [draft, setDraft] = useState("");
  // Rows are draggable only while their handle is held, so text selection
  // inside the URL field keeps working.
  const [armed, setArmed] = useState<number | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    if (item === undefined) return;
    next.splice(to, 0, item);
    onChange(next);
  };

  // Accepts one URL or several (pasted list, whitespace/newline separated).
  const add = () => {
    const urls = draft.split(/\s+/).filter((url) => url.length > 0);
    if (urls.length === 0) return;
    onChange([...value, ...urls]);
    setDraft("");
  };

  const iconButton =
    "flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-40";

  return (
    <div className="flex flex-col gap-2">
      {value.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 px-3 py-4 text-center text-xs text-gray-500">
          {emptyText}
        </p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {value.map((url, i) => {
            const hostOk = !url.trim() || imageHostAllowed(url);
            return (
              <li
                key={i}
                draggable={!disabled && armed === i}
                onDragStart={(e) => {
                  setDragFrom(i);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  if (dragFrom === null) return;
                  e.preventDefault();
                  setDragOver(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragFrom !== null) move(dragFrom, i);
                  setArmed(null);
                  setDragFrom(null);
                  setDragOver(null);
                }}
                onDragEnd={() => {
                  setArmed(null);
                  setDragFrom(null);
                  setDragOver(null);
                }}
                className={cn(
                  "flex flex-col gap-1 rounded-md border border-gray-200 bg-white p-1.5",
                  dragFrom === i && "opacity-50",
                  dragOver === i && dragFrom !== i && "border-sky-500",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    title="Drag to reorder"
                    onMouseDown={() => setArmed(i)}
                    onMouseUp={() => setArmed(null)}
                    className={cn(
                      "flex w-5 shrink-0 select-none flex-col items-center text-xs leading-tight text-gray-500",
                      !disabled && "cursor-grab",
                    )}
                  >
                    <span>⠿</span>
                    <span>{i + 1}</span>
                  </span>
                  <Thumb key={url} url={url} />
                  <input
                    value={url}
                    onChange={(e) => onChange(value.map((v, j) => (j === i ? e.target.value : v)))}
                    disabled={disabled}
                    aria-label={`Image ${i + 1} URL`}
                    title={url}
                    className={cn(inputCls, "h-8 min-w-0 flex-1 py-1 font-mono text-xs")}
                  />
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className={iconButton}
                      onClick={() => move(i, i - 1)}
                      disabled={disabled || i === 0}
                      aria-label={`Move image ${i + 1} up`}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={iconButton}
                      onClick={() => move(i, i + 1)}
                      disabled={disabled || i === value.length - 1}
                      aria-label={`Move image ${i + 1} down`}
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className={cn(iconButton, "hover:border-red-500 hover:text-red-600")}
                      onClick={() => onChange(value.filter((_, j) => j !== i))}
                      disabled={disabled}
                      aria-label={`Remove image ${i + 1}`}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {!hostOk && (
                  <p className="pl-7 text-xs text-amber-700">
                    Not an https URL on an allowed image host — the shop can&apos;t render it. Upload
                    the file to the S3 bucket and paste that URL instead.
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <div className="flex gap-2">
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          disabled={disabled}
          placeholder="Paste an image URL (or several, separated by spaces/newlines)"
          className={cn(inputCls, "h-8 min-w-0 flex-1 py-1 font-mono text-xs")}
        />
        <button
          type="button"
          onClick={add}
          disabled={disabled || !draft.trim()}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}
