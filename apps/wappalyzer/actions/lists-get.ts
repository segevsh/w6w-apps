import type { ActionDefinition } from "@w6w/types";
import { listPath, WappalyzerClient } from "../lib/client.ts";
import { listIdParam } from "../lib/params.ts";

/**
 * `GET /v2/lists/{id}` — a lead list's full detail: filters, pricing, status,
 * and — once ready — its download URLs.
 *
 * Verified against `getLeadList` / `ListDetail` in Wappalyzer's OpenAPI
 * contract and `docs/api/v2/lists/` (fetched 2026-09-29). Free, and the
 * OpenAPI document declares no `wappalyzer-credits-*` headers for this read.
 */
interface Input {
  id: string;
}

const listsGet: ActionDefinition<Input> = {
  key: "lists-get",
  type: "read",
  resource: "list",
  title: "Get Lead List",
  description:
    "Fetch a lead list's full detail by ID — filters, status, pricing, and download URLs once " +
    "ready.",
  params: [listIdParam],
  output: [{ key: "list", type: "object", label: "Lead list" }],

  async execute(input, ctx) {
    const client = new WappalyzerClient(ctx);
    const { data } = await client.get<unknown>(listPath(input.id));
    return { list: data };
  },
};

export default listsGet;
