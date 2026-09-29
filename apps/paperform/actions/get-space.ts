import type { ActionDefinition } from "@w6w/types";
import { PaperformClient } from "../lib/client.ts";
import { spaceIdParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/**
 * `GET /spaces/{id}` — a space by ID.
 *
 * Business plan only, per Paperform's own docs.
 */
const getSpace: ActionDefinition<Input> = {
  key: "get-space",
  type: "read",
  resource: "space",
  title: "Get Space",
  description: "Get a space by ID. Requires the Business plan.",
  params: [spaceIdParam],
  output: [{ key: "space", type: "object", label: "Space" }],

  async execute(input, ctx) {
    const results = await new PaperformClient(ctx).results<{ space?: unknown }>(
      `/spaces/${encodeURIComponent(input.id)}`,
    );
    return { space: results?.space };
  },
};

export default getSpace;
