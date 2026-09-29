import type { ActionDefinition } from "@w6w/types";
import { listPath, WappalyzerClient } from "../lib/client.ts";
import { creditsOutputFields, listIdParam } from "../lib/params.ts";

/**
 * `POST /v2/lists/{id}` — spend credits to unlock a ready list's full
 * download.
 *
 * Verified against `finalizeLeadList` / `FinalizeListRequest` /
 * `FinalizeListResponse` in Wappalyzer's OpenAPI contract and
 * `docs/api/v2/lists/` (fetched 2026-09-29). `spendCredits` MUST exactly
 * match the list's own `totalCredits` (from the create callback or
 * `lists-get`) — this action does not guess or default it, since sending the
 * wrong figure is a billing mistake, not a convenience to paper over.
 *
 * Not marked idempotent: retrying a purchase against a list already moved to
 * `Complete` is not a safe no-op this app can assume without documentation
 * saying so.
 */
interface Input {
  id: string;
  spendCredits: number;
}

interface FinalizeListResponse {
  id: string;
  status: "Complete";
  url?: string;
}

const listsFinalize: ActionDefinition<Input> = {
  key: "lists-finalize",
  type: "perform",
  resource: "list",
  title: "Finalize Lead List",
  description: "Spend credits to finalize a Ready lead list and unlock its full download URL.",
  idempotent: false,
  params: [
    listIdParam,
    {
      key: "spendCredits",
      label: "Credits to spend",
      type: "number",
      required: true,
      validation: { integer: true, min: 0 },
      hint: "Must exactly match the list's totalCredits, from the create callback or Get Lead " +
        "List.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "List ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "url", type: "string", label: "Download URL (ZIP)" },
    ...creditsOutputFields,
  ],

  async execute(input, ctx) {
    const client = new WappalyzerClient(ctx);
    const { data, creditsSpent, creditsRemaining } = await client.post<FinalizeListResponse>(
      listPath(input.id),
      { spendCredits: input.spendCredits },
    );
    return { id: data?.id, status: data?.status, url: data?.url, creditsSpent, creditsRemaining };
  },
};

export default listsFinalize;
