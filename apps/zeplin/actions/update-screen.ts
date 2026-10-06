import type { ActionDefinition } from "@w6w/types";
import { type Input, projectIdParam, screenIdParam, screenPath } from "../lib/actions.ts";
import { toList, ZeplinClient } from "../lib/client.ts";

const updateScreen: ActionDefinition<Input> = {
  key: "update-screen",
  type: "perform",
  resource: "screen",
  title: "Update Screen",
  description:
    "Update a screen's description and/or tags (PATCH /v1/projects/{project_id}/screens/{screen_id}). Tags replace the existing set.",
  idempotent: true,
  params: [
    projectIdParam,
    screenIdParam,
    { key: "description", label: "New description", type: "text" },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated; replaces the screen's tags. Leave empty to keep them.",
    },
  ],
  output: [{ key: "updated", type: "boolean", label: "True when the vendor answered 204" }],

  async execute(input, ctx) {
    const body: Record<string, unknown> = {};
    if (input.description !== undefined && input.description !== null) {
      body.description = String(input.description);
    }
    const tags = toList(input.tags as string | string[] | undefined);
    if (tags.length) body.tags = [...new Set(tags)];
    if (Object.keys(body).length === 0) throw new Error("Set a description or tags to update");
    await new ZeplinClient(ctx).request("PATCH", screenPath(input), { body });
    return { updated: true };
  },
};

export default updateScreen;
