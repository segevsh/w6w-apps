import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/checks` — verified against Checkly's OpenAPI document
 * (`getV1Checks`).
 *
 * **Every list endpoint in this API answers a bare array** — no envelope, no
 * total, no cursor. The only way to know a page was the last is that it came
 * back shorter than asked for, which is what the client's walk tests.
 *
 * `activated` on a check is the field that decides whether it is actually
 * running. A deactivated check is still listed, still has results from before,
 * and is monitoring nothing.
 */
const action: ActionDefinition = {
  key: "check-list",
  type: "read",
  resource: "check",
  title: "List checks",
  description: "List monitors, optionally filtered by type, tag or status.",
  params: [
    {
      key: "checkType",
      label: "Check Type",
      type: "string",
      default: "",
      placeholder: "API",
      hint: "BROWSER, API, MULTI_STEP, HEARTBEAT, TCP, DNS, SSL, ICMP or URL.",
    },
    {
      key: "tag",
      label: "Tags",
      type: "string",
      default: "",
      hint: "Comma-separated. Checks carrying any of them.",
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      default: "",
      hint: "Matches the check name.",
    },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Checkly checks", { returnAll, limit });

    return await new ChecklyClient(ctx).requestAll("/v1/checks", {
      query: {
        checkType: (p.checkType as string) || undefined,
        tag: (p.tag as string) || undefined,
        search: (p.search as string) || undefined,
      },
    }, returnAll ? Infinity : limit);
  },
};

export default action;
