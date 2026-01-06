// components/product-details-text.tsx
import React from "react";

type Block =
  | { type: "para"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "heading"; text: string };

function isWhatsIncludedLine(line: string): boolean {
  const t = line.trim();
  // Accept both curly and straight apostrophe, with/without colon
  return (
    t === "What’s Included:" ||
    t === "What's Included:" ||
    t === "What’s Included" ||
    t === "What's Included" ||
    t.toLowerCase() === "includes:" ||
    t.toLowerCase() === "includes" ||
    t.toLowerCase() === "technical specs:"
  );
}

function parseBlocks(input: string): Block[] {
  const lines = input.replace(/\r\n/g, "\n").split("\n");

  const blocks: Block[] = [];
  let paraLines: string[] = [];
  let listItems: string[] = [];

  const flushPara = () => {
    const text = paraLines.join("\n").trim();
    if (text) blocks.push({ type: "para", text });
    paraLines = [];
  };

  const flushList = () => {
    if (listItems.length) blocks.push({ type: "ul", items: listItems });
    listItems = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Blank line separates blocks
    if (line.trim() === "") {
      flushList();
      flushPara();
      continue;
    }

    // Standalone "What's Included" line becomes a bold heading block
    if (isWhatsIncludedLine(line)) {
      flushList();
      flushPara();
      blocks.push({ type: "heading", text: line.trim() });
      continue;
    }

    // Bullet lines: ONLY hyphen-minus '-' counts (not en/em dash)
    // This explicitly matches ASCII '-' only.
    const bulletMatch = line.match(/^\s*-\s+(.*)$/);
    if (bulletMatch) {
      flushPara();
      listItems.push(bulletMatch[1].trim());
      continue;
    }

    // Normal text line
    flushList();
    paraLines.push(line);
  }

  flushList();
  flushPara();

  return blocks;
}

export function ProductDetailsText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const blocks = parseBlocks(text);

  return (
    <div className={`text-gray-700 space-y-3 ${className}`}>
      {blocks.map((b, idx) => {
        if (b.type === "heading") {
          return (
            <div key={idx} className="font-semibold">
              {b.text}
            </div>
          );
        }

        if (b.type === "ul") {
          return (
            <ul key={idx} className="list-disc list-inside space-y-1 pl-1">
              {b.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          );
        }

        // paragraph
        return (
          <p key={idx} className="whitespace-pre-line">
            {b.text}
          </p>
        );
      })}
    </div>
  );
}
