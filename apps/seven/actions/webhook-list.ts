import type { ActionDefinition } from "@w6w/types";
import { SevenClient } from "../lib/client.ts";

/**
 * `GET /api/hooks` — the active webhooks. Each entry's `headers` field holds the custom headers
 * the webhook sends, which may include an `Authorization` value; they are masked here.
 */
const webhookList: ActionDefinition<Record<string, never>> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description:
    "List the account's active webhooks. Custom delivery headers are replaced by a has_headers flag, since they can carry credentials.",
  params: [],
  output: [{ key: "hooks", type: "array", label: "Webhooks (headers masked)" }],

  async execute(_input, ctx) {
    const body = await new SevenClient(ctx).request("GET", "/hooks") as {
      hooks?: Array<Record<string, unknown>>;
    };
    const hooks = (body.hooks ?? []).map(({ headers, ...rest }) => ({
      ...rest,
      has_headers: typeof headers === "string" && headers.trim() !== "",
    }));
    return { ...body, hooks };
  },
};

export default webhookList;
