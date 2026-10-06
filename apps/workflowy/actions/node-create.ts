import type { ActionDefinition } from "@w6w/types";
import { compact, WorkflowyClient } from "../lib/client.ts";

interface Input {
  name: string;
  parent_id?: string;
  layoutMode?: string;
  note?: string;
  position?: string;
}

/**
 * `POST /api/v1/nodes`. Answers only `{"item_id"}`, so this action returns
 * `{ id }`; call Get Node for the full node. `name` is parsed as markdown
 * (`**bold**`, `# header`, `- [ ] todo`, `[2026-01-15]` dates) and a multi-line
 * name creates children — the first line is the parent, `\n\n` separates them.
 * Not idempotent: a retry creates a second bullet.
 */
const nodeCreate: ActionDefinition<Input> = {
  key: "node-create",
  type: "perform",
  resource: "node",
  title: "Create Node",
  description:
    "Create a bullet, todo, header or other node under a parent, the Inbox or a calendar day.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Text",
      type: "text",
      required: true,
      hint: "Markdown is parsed: **bold**, # header, - [ ] todo, [2026-01-15] date.",
    },
    {
      key: "parent_id",
      label: "Parent",
      type: "string",
      default: "inbox",
      hint:
        'Node id, 12-character short id, WorkFlowy URL, shortcut key, "None" (top level), "inbox", "today", "tomorrow", "next_week", or a YYYY / YYYY-MM / YYYY-MM-DD calendar key.',
    },
    {
      key: "layoutMode",
      label: "Layout",
      type: "select",
      options: [
        { value: "bullets", label: "Bullet (default)" },
        { value: "todo", label: "Todo" },
        { value: "h1", label: "Header 1" },
        { value: "h2", label: "Header 2" },
        { value: "h3", label: "Header 3" },
        { value: "code-block", label: "Code block" },
        { value: "quote-block", label: "Quote block" },
      ],
    },
    { key: "note", label: "Note", type: "text" },
    {
      key: "position",
      label: "Position",
      type: "select",
      default: "top",
      options: [{ value: "top", label: "Top" }, { value: "bottom", label: "Bottom" }],
    },
  ],
  output: [{ key: "id", type: "string", label: "New node ID" }],

  async execute(input, ctx) {
    const res = await new WorkflowyClient(ctx).request<{ item_id?: string }>("/nodes", {
      method: "POST",
      body: compact({
        parent_id: input.parent_id,
        name: input.name,
        layoutMode: input.layoutMode,
        note: input.note,
        position: input.position,
      }),
    });
    return { id: res.item_id };
  },
};

export default nodeCreate;
