import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";
interface Input {
  blockId: string;
  children: unknown[];
  after?: string;
  position?: Record<string, unknown>;
  notifications?: Record<string, unknown>;
}
const action: ActionDefinition<Input> = {
  key: "append-block-children",
  type: "perform",
  resource: "block",
  title: "Append Block Children",
  description: "Insert blocks into a page or block, optionally choosing their position.",
  output: [
    { "key": "type", "type": "string", "label": "Type" },
    { "key": "block", "type": "object", "label": "Block" },
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "next_cursor", "type": "string", "label": "Next cursor" },
    { "key": "has_more", "type": "boolean", "label": "Has more" },
    { "key": "results", "type": "array", "label": "Results" },
  ],
  idempotent: false,
  params: [
    { key: "blockId", label: "Parent Block ID", type: "string", required: true },
    { key: "children", label: "Children (blocks)", type: "json", required: true },
    {
      key: "position",
      label: "Position",
      type: "json",
      hint: '{"type":"start"}, {"type":"end"}, or {"type":"after_block","after_block":{"id":"…"}}.',
    },
    {
      key: "after",
      label: "Insert after block ID (compatibility)",
      type: "string",
      advanced: true,
      hint: "Translated to the current position object. Do not combine with Position.",
    },
    { key: "notifications", label: "Notifications", type: "json", advanced: true },
  ],
  execute(input, ctx) {
    if (input.after && input.position) {
      throw new Error("Provide Position or Insert after block ID, not both.");
    }
    return new NotionClient(ctx).request(`/blocks/${pathId(input.blockId)}/children`, {
      method: "PATCH",
      body: {
        children: input.children,
        position: input.position ??
          (input.after ? { type: "after_block", after_block: { id: input.after } } : undefined),
        notifications: input.notifications,
      },
    });
  },
};
export default action;
