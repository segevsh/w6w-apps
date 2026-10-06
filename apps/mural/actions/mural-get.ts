import type { ActionDefinition } from "@w6w/types";
import { encodeId, one } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/**
 * `GET /murals/{muralId}` (Mural public API v1). OAuth scope: `murals:read`.
 */
type Input = {
  muralId: string;
};

const muralGet: ActionDefinition<Input> = {
  key: "mural-get",
  type: "read",
  resource: "mural",
  title: "Get Mural",
  description: "Fetch one mural. Needs the `murals:read` OAuth scope.",
  params: [
    str("muralId", "Mural ID", {
      required: true,
      hint: 'The mural ID, e.g. "ws12345.1608152669000".',
    }),
  ],
  output: [
    { key: "id", type: "string", label: "Mural ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "roomId", type: "number", label: "Room ID" },
    { key: "workspaceId", type: "string", label: "Workspace ID" },
    { key: "status", type: "string", label: "active or archived" },
    { key: "createdOn", type: "number", label: "Created (epoch ms)" },
  ],

  execute(input, ctx) {
    return one(ctx, "GET", `/murals/${encodeId(input.muralId)}`);
  },
};

export default muralGet;
