import type { ActionDefinition } from "@w6w/types";
import { listPath, WappalyzerClient } from "../lib/client.ts";
import { listIdParam } from "../lib/params.ts";

/**
 * `DELETE /v2/lists/{id}` — permanently delete a lead list.
 *
 * Verified against `deleteLeadList` / `EmptyObject` in Wappalyzer's OpenAPI
 * contract (fetched 2026-09-29): a `200 {}` on success. Free, and the
 * OpenAPI document declares no `wappalyzer-credits-*` headers for it.
 *
 * Marked idempotent: deleting an already-deleted (or never-existent) list is
 * an ordinary DELETE semantics case, safe to retry — unlike creating or
 * finalizing a list, which either creates a new resource or spends credits.
 */
interface Input {
  id: string;
}

const listsDelete: ActionDefinition<Input> = {
  key: "lists-delete",
  type: "perform",
  resource: "list",
  title: "Delete Lead List",
  description: "Permanently delete a lead list.",
  idempotent: true,
  params: [listIdParam],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const client = new WappalyzerClient(ctx);
    await client.delete<Record<string, never>>(listPath(input.id));
    return { deleted: true };
  },
};

export default listsDelete;
