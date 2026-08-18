import type { ActionDefinition } from "@w6w/types";
import { VantaClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/frameworks` — what this organisation is being held to.
 *
 * SOC 2, ISO 27001, HIPAA, GDPR, PCI DSS — whichever the tenant has enabled.
 * This is the first call in most Vanta workflows because nearly every other
 * filter takes a framework id, and because the same test means different things
 * depending on which certification it is evidence for.
 *
 * It is also the cheapest authenticated call in the API, which is why both
 * health checks and the connection test use it.
 */
const action: ActionDefinition = {
  key: "framework-list",
  type: "read",
  resource: "framework",
  title: "List frameworks",
  description:
    "The compliance frameworks this tenant tracks. Most other filters take a framework id, and " +
    "the same test means different things depending on which certification it evidences.",
  params: [...LIST_PARAMS],
  output: [
    { key: "frameworks", type: "array", label: "Frameworks" },
    { key: "count", type: "number", label: "Frameworks returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new VantaClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));
    const page = await client.pageAll(
      "/frameworks",
      {},
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );
    return { frameworks: page.items, count: page.items.length };
  },
};

export default action;
