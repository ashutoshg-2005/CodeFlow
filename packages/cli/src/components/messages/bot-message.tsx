import { EmptyBorder } from "../border";
import { useTheme } from "../../providers/theme";
import type { ClientMessagePart, ClientToolCallPart } from "../../hooks/use-chat";
import { Mode } from "@codeflow/database/enums";
import { TextAttributes } from "@opentui/core";
import type { ThemeColors } from "../../theme";

type Props = {
  parts: ClientMessagePart[];
  model: string;
  mode: Mode;
  duration?: string;
  streaming?: boolean;
  interrupted?: boolean;
};

function formatToolName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
};

function formatToolArgs(tc: ClientToolCallPart): string {
  return Object.values(tc.args).map(String).join(" ");
};

type PartGroup = {
  type: ClientMessagePart["type"];
  parts: ClientMessagePart[];
  key: string;
};

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "code"; language: string; text: string }
  | { type: "rule" };

function cleanInlineMarkdown(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1");
}

function parseMarkdown(text: string): MarkdownBlock[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listOrdered = false;
  let quote: string[] = [];
  let code: string[] | null = null;
  let codeLanguage = "";

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join("\n") });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length) {
      blocks.push({ type: "list", ordered: listOrdered, items: listItems });
      listItems = [];
    }
  };

  const flushQuote = () => {
    if (quote.length) {
      blocks.push({ type: "quote", text: quote.join("\n") });
      quote = [];
    }
  };

  const flushTextBlocks = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const fence = trimmed.match(/^```(\S*)?/);

    if (code) {
      if (fence) {
        blocks.push({ type: "code", language: codeLanguage, text: code.join("\n") });
        code = null;
        codeLanguage = "";
      } else {
        code.push(line);
      }
      continue;
    }

    if (fence) {
      flushTextBlocks();
      code = [];
      codeLanguage = fence[1] ?? "";
      continue;
    }

    if (!trimmed) {
      flushTextBlocks();
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushTextBlocks();
      blocks.push({ type: "rule" });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushTextBlocks();
      blocks.push({
        type: "heading",
        level: heading[1]!.length,
        text: cleanInlineMarkdown(heading[2]!),
      });
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      quote.push(cleanInlineMarkdown(quoteMatch[1] ?? ""));
      continue;
    }

    const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      flushQuote();
      const isOrdered = Boolean(ordered);
      if (listItems.length && listOrdered !== isOrdered) {
        flushList();
      }
      listOrdered = isOrdered;
      listItems.push(cleanInlineMarkdown((ordered ?? unordered)![1]!));
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(cleanInlineMarkdown(line));
  }

  if (code) {
    blocks.push({ type: "code", language: codeLanguage, text: code.join("\n") });
  }
  flushTextBlocks();

  return blocks;
}

function MarkdownPreview({ text, colors }: { text: string; colors: ThemeColors }) {
  const blocks = parseMarkdown(text);

  return (
    <box flexDirection="column" gap={1} width="100%">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <text
              key={`md-heading-${index}`}
              attributes={TextAttributes.BOLD}
              fg={block.level <= 2 ? colors.primary : undefined}
              wrapMode="word"
              width="100%"
            >
              {block.text}
            </text>
          );
        }

        if (block.type === "list") {
          return (
            <box key={`md-list-${index}`} flexDirection="column" gap={0} width="100%">
              {block.items.map((item, itemIndex) => (
                <text key={`md-list-${index}-${itemIndex}`} wrapMode="word" width="100%">
                  {block.ordered ? `${itemIndex + 1}. ` : "- "}
                  {item}
                </text>
              ))}
            </box>
          );
        }

        if (block.type === "quote") {
          return (
            <box
              key={`md-quote-${index}`}
              border={["left"]}
              borderColor={colors.dimSeparator}
              customBorderChars={{ ...EmptyBorder, vertical: "|" }}
              paddingX={2}
              width="100%"
            >
              <text attributes={TextAttributes.DIM} wrapMode="word" width="100%">
                {block.text}
              </text>
            </box>
          );
        }

        if (block.type === "code") {
          return (
            <box
              key={`md-code-${index}`}
              border={["left"]}
              borderColor={colors.dimSeparator}
              customBorderChars={{ ...EmptyBorder, vertical: "|" }}
              paddingX={2}
              width="100%"
            >
              <box flexDirection="column" gap={0} width="100%">
                {block.language ? (
                  <text attributes={TextAttributes.DIM} fg={colors.info}>
                    {block.language}
                  </text>
                ) : null}
                <text wrapMode="word" width="100%">
                  {block.text}
                </text>
              </box>
            </box>
          );
        }

        if (block.type === "rule") {
          return (
            <text key={`md-rule-${index}`} attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
              ----------------------------------------
            </text>
          );
        }

        return (
          <text key={`md-paragraph-${index}`} wrapMode="word" width="100%">
            {block.text}
          </text>
        );
      })}
    </box>
  );
}

function groupConsecutiveParts(parts: ClientMessagePart[]): PartGroup[] {
  const groups: PartGroup[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    const lastGroup = groups[groups.length - 1];

     if (lastGroup && lastGroup.type === part.type) {
      lastGroup.parts.push(part);
     } else {
      const key = 
        part.type === "tool-call" ? `group-tc-${part.id}` : `group-${part.type}-${i}`;
      groups.push({ type: part.type, parts: [part], key });
     }
  }

  return groups;
};

export function BotMessage({ 
  parts,
  model,
  mode,
  duration,
  streaming = false,
  interrupted = false,
}: Props) {
  const { colors } = useTheme();
  return (
    <box width="100%" alignItems="center">
      {groupConsecutiveParts(parts).map((group) => (
        <box key={group.key} paddingY={1} width="100%">
          {group.parts.map((part, j) => {
            if (part.type === "reasoning") {
              return (
                <box
                  key={`reasoning-${j}`}
                  border={["left"]}
                  borderColor={colors.thinkingBorder}
                  customBorderChars={{
                    ...EmptyBorder,
                    vertical: "│",
                  }}
                  width="100%"
                  paddingX={2}
                >
                  <text attributes={TextAttributes.DIM}>
                    <em fg={colors.thinking}>Thinking:</em> {part.text}
                  </text>
                </box>
              );
            }

            if (part.type === "tool-call") {
              return (
                <box
                  key={part.id}
                  border={["left"]}
                  borderColor={colors.thinkingBorder}
                  customBorderChars={{
                    ...EmptyBorder,
                    vertical: "│",
                  }}
                  width="100%"
                  paddingX={2}
                >
                  <text attributes={TextAttributes.DIM}>
                    <em fg={colors.info}>{formatToolName(part.name)}:</em> {formatToolArgs(part)}
                    {part.status === "calling" ? " …" : ""}
                  </text>
                </box>
              );
            }

            if (part.type === "text") {
              return (
                <box key={`text-${j}`} paddingX={3} width="100%">
                  <MarkdownPreview text={part.text} colors={colors} />
                </box>
              );
            }
            
            return null;
          })}
        </box>
      ))}

      <box paddingX={3} paddingBottom={1} gap={1} width="100%">
        <box flexDirection="row" gap={2}>
          
          <text
            attributes={interrupted ? TextAttributes.DIM : 0}
            fg={interrupted ? undefined : mode === Mode.PLAN ? colors.planMode : colors.primary}
          >
            ◉
          </text>
          
          <box flexDirection="row" gap={1}>
            
            <text attributes={interrupted ? TextAttributes.DIM : 0}>
              {mode === Mode.PLAN ? "Plan" : "Build"}
            </text>

            <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
              ›
            </text>
            <text attributes={TextAttributes.DIM}>{model}</text>
            {(duration || interrupted) && (
              <>
                <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
                  ›
                </text>
                <text attributes={TextAttributes.DIM}>
                  {interrupted ? "interrupted" : duration}
                </text>
              </>
            )}
          </box>
        </box>
      </box>
    </box>
  );
};
