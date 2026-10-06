import type { ActionDefinition } from "@w6w/types";
import { compact, seg, WorkflowyClient } from "../lib/client.ts";

interface Input {
  id: string;
  parent_id: string;
  position?: string;
}

/**
 * `POST /api/v1/nodes/:id/mirror`. Unlike every other parent field in this API,
 * `parent_id` here must be a **full node id** — target keys ("inbox"), calendar
 * keys and "None" are rejected. Mirroring a mirror follows it to the origin, so
 * `origin_id` can differ from `id`.
 */
const nodeMirrorCreate: ActionDefinition<Input> = {
  key: "node-mirror-create",
  type: "perform",
  resource: "mirror",
  title: "Create Mirror",
  description: "Mirror a node under another parent so its content appears in both places.",
  idempotent: false,
  params: [
    { key: "id", label: "Node to mirror", type: "string", required: true },
    {
      key: "parent_id",
      label: "Mirror under",
      type: "string",
      required: true,
      hint:
        "Full node id only. Shortcut keys, inbox, calendar keys and None are not accepted here.",
    },
    {
      key: "position",
      label: "Position",
      type: "select",
      default: "top",
      options: [{ value: "top", label: "Top" }, { value: "bottom", label: "Bottom" }],
    },
  ],
  output: [
    { key: "id", type: "string", label: "New mirror node ID" },
    { key: "origin_id", type: "string", label: "Origin node ID" },
  ],

  async execute(input, ctx) {
    const res = await new WorkflowyClient(ctx).request<{ item_id?: string; origin_id?: string }>(
      `/nodes/${seg(input.id)}/mirror`,
      { method: "POST", body: compact({ parent_id: input.parent_id, position: input.position }) },
    );
    return { id: res.item_id, origin_id: res.origin_id };
  },
};

export default nodeMirrorCreate;
