import type { ActionDefinition } from "@w6w/types";
import { SliteClient } from "../lib/client.ts";
import { noteIdParam, seg } from "../lib/params.ts";

/**
 * `PUT /v1/notes/{noteId}/tiles/{tileId}` (operationId `updateTile`) — "Update or create tile".
 *
 * A tile is a block with a structured header (title, icon, status, link) and Markdown content.
 * To create one, copy a tile id in Slite via "Copy block id" on an empty line's settings.
 * Every body field is nullable and optional. The status colour must be `#rrggbb`
 * (`^#[0-9a-fA-F]{6}$`). The 200 body is `{url}`, the tile's direct URL.
 */
interface Input {
  noteId: string;
  tileId: string;
  title?: string;
  iconURL?: string;
  url?: string;
  content?: string;
  statusLabel?: string;
  statusColor?: string;
}

const tileUpdate: ActionDefinition<Input> = {
  key: "tile-update",
  type: "perform",
  resource: "tile",
  title: "Update Tile",
  description: "Update (or create) a tile block inside a note with a title, status, link and " +
    "Markdown content.",
  idempotent: true,
  params: [
    noteIdParam,
    {
      key: "tileId",
      label: "Tile ID",
      type: "string",
      required: true,
      hint: 'In Slite, "Copy block id" on an empty line\'s settings creates a tile id.',
    },
    { key: "title", label: "Title", type: "string" },
    { key: "iconURL", label: "Icon URL", type: "string" },
    { key: "url", label: "Link URL", type: "string", hint: "Link the tile to an external URL." },
    {
      key: "content",
      label: "Content",
      type: "text",
      hint: "Markdown, e.g. `- [ ] Release it to everyone`.",
    },
    { key: "statusLabel", label: "Status label", type: "string", placeholder: "In progress" },
    {
      key: "statusColor",
      label: "Status color",
      type: "string",
      validation: { pattern: "^#[0-9a-fA-F]{6}$" },
      placeholder: "#fcc93c",
      hint: "Hex colour for the status. Needs a status label.",
    },
  ],
  output: [{ key: "url", type: "string", label: "Direct URL of the tile in the note" }],

  execute(input, ctx) {
    const color = (input.statusColor ?? "").trim();
    const label = (input.statusLabel ?? "").trim();
    if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      throw new Error("statusColor must be a #rrggbb hex colour");
    }
    if (color && !label) throw new Error("statusColor needs a statusLabel");
    return new SliteClient(ctx).request(
      `/notes/${seg(input.noteId, "noteId")}/tiles/${seg(input.tileId, "tileId")}`,
      {
        method: "PUT",
        body: {
          title: input.title || undefined,
          iconURL: input.iconURL || undefined,
          url: input.url || undefined,
          content: input.content || undefined,
          status: label ? { label, colorHex: color || undefined } : undefined,
        },
      },
    );
  },
};

export default tileUpdate;
