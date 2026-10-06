import type { ActionDefinition } from "@w6w/types";
import { FormbricksClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `GET /api/v1/management/me` */
const meGet: ActionDefinition<Input> = {
  key: "me-get",
  type: "read",
  resource: "me",
  title: "Get API Key Info",
  description:
    "Return what the API key resolves to: the workspace it is bound to (single-workspace keys) or its organization and per-workspace permissions (organization keys). Never returns the key itself.",
  params: [],
  output: [
    {
      key: "me",
      type: "object",
      label: "The raw Formbricks `me` document (not wrapped in `data`)",
    },
  ],

  async execute(_input, ctx) {
    const res = await new FormbricksClient(ctx).request("GET", "/management/me");
    return { me: res };
  },
};

export default meGet;
