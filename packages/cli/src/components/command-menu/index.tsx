import { TextAttributes, type ScrollBoxRenderable } from "@opentui/core";
import type { RefObject } from "react";
import { COMMANDS } from "./commands";
import { getfilteredCommands } from "./filter-commands";

const MAX_VISIBLE_COMMANDS = 8;

const COMMAND_COL_WIDTH = Math.max(...COMMANDS.map((cmd) => cmd.name.length)) + 2;

type CommandMenuProps = {
  query: string;
  selectedIndex: number;
  scrollRef: RefObject<ScrollBoxRenderable | null>;
  onSelect: (index: number) => void;
  onExecute: (index: number) => void;
}

export function CommandMenu({ query, selectedIndex, scrollRef, onSelect, onExecute }: CommandMenuProps) {
  const filtered = getfilteredCommands(query);
  const visibleCommands = Math.min(filtered.length, MAX_VISIBLE_COMMANDS);

  if (filtered.length === 0) {
    return (
      <box paddingX = {1}>
        <text attributes = {TextAttributes.DIM}>
          No commands found
        </text>
      </box>
    )
  }

  return (
    <scrollbox ref = {scrollRef} height = {visibleCommands}>
      {filtered.map((cmd, i) => {
        const isSelected = i === selectedIndex;

        return (
          <box
            key = {cmd.name}
            flexDirection = "row"
            paddingX = {1}
            height = {1}
            overflow = "hidden"
            backgroundColor = {isSelected ? "#89B4FA" : undefined}
            onMouseMove = {() => onSelect(i)}
            onMouseDown = {() => onExecute(i)}
          >
            <box width = {COMMAND_COL_WIDTH} flexShrink = {0}>
              <text selectable = {false} fg = {isSelected ? "black" : "white" }>
                /{cmd.name} 
              </text>
            </box>
            <box flexGrow = {1} flexShrink = {1} overflow = "hidden">
              <text selectable = {false} fg = {isSelected ? "black" : "grey" }>
                {cmd.description}
              </text>
            </box>
          </box>
        )

      })}
    </scrollbox>
  )
}