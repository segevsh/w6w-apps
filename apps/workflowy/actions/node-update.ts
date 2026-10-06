import type { ActionDefinition } from "@w6w/types";
import { compact, seg, WorkflowyClient } from "../lib/client.ts";

interface Input {
  id: string;
  name?: string;
  layoutMode?: string;
  note?: string;
}

/** `POST /api/v1/nodes/:id`. Unset fields are left unchanged; answers `{"status":"ok"}`. */
const nodeUpdate: ActionDefinition<Input> = {
  key: "node-update",
  type: "perform",
  resource: "node",
  title: "Update Node",
  description: "Change a node's text, layout or note. Fields you leave empty are not changed.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Node ID",
      type: "string",
      required: true,
      hint: "Full id or 12-character short id.",
    },
    {
      key: "name",
      label: "Text",
      type: "text",
      hint: "Inline HTML only: <b>, <i>, <s>, <code>, <a href>.",
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
  ],
  output: [{ key: "status", type: "string", label: "Status (ok)" }],

  async execute(input, ctx) {
    const body = compact({ name: input.name, layoutMode: input.layoutMode, note: input.note });
    if (Object.keys(body).length === 0) {
      throw new Error("Provide at least one of text, layout or note");
    }
    return await new WorkflowyClient(ctx).request(`/nodes/${seg(input.id)}`, {
      method: "POST",
      body,
    });
  },
};

export default nodeUpdate;
