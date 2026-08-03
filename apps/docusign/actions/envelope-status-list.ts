import type { ActionDefinition } from "@w6w/types";
import { DocusignClient } from "../lib/client.ts";
import { envelopeListOutput, paging, type PagingInput } from "../lib/params.ts";

interface Input extends PagingInput {
  envelopeIds: string;
  status?: string;
}

/** Split a comma/space/newline separated list into trimmed, non-empty ids. */
export function idList(raw: string): string[] {
  return raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
}

/**
 * `PUT /restapi/v2.1/accounts/{accountId}/envelopes/status` — `Envelopes:
 * listStatus`. One call, many envelopes: the ids go in the request body as
 * `{ "envelopeIds": [...] }` and the query carries the documented sentinel
 * `envelope_ids=request_body` to tell Docusign to read them from there.
 *
 * **It is a `PUT` that changes nothing**, which is Docusign's design, not a
 * mistake here — the verb exists so a long id list can travel in a body rather
 * than a query string. It is declared `type: "read"` because that is what it
 * does; nothing is written.
 *
 * **No date filters.** Docusign documents that this endpoint takes *exactly
 * one* of `from_date`, `envelope_ids` and `transaction_ids`. This action is the
 * `envelope_ids` branch, so offering a From date alongside would build a
 * request the API rejects.
 *
 * This is the endpoint to reach for when a workflow tracks a batch of
 * envelopes. Docusign's rate-limit guidance is explicit that per-envelope
 * polling is the wrong shape — apps are limited to one status GET per unique
 * envelope per 15 minutes, and repeated single-envelope polling is flagged as a
 * rate-limit violation during app review. One batched call here beats N calls
 * to `envelope-get`.
 */
const envelopeStatusList: ActionDefinition<Input> = {
  key: "envelope-status-list",
  type: "read",
  resource: "envelope",
  title: "Get Envelope Statuses",
  description:
    "Fetch the status of many envelopes in one call. Preferred over polling each envelope separately — Docusign rate-limits per-envelope status polling.",
  params: [
    {
      key: "envelopeIds",
      label: "Envelope IDs",
      type: "text",
      required: true,
      hint: "Envelope GUIDs, separated by commas, spaces or newlines.",
    },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "Comma-separated statuses to restrict the result to.",
    },
    ...paging,
  ],
  output: envelopeListOutput,

  execute(input, ctx) {
    const envelopeIds = idList(input.envelopeIds);
    if (envelopeIds.length === 0) {
      throw new Error("`envelopeIds` must contain at least one envelope GUID.");
    }
    return new DocusignClient(ctx).request("/envelopes/status", {
      method: "PUT",
      query: {
        envelope_ids: "request_body",
        status: input.status,
        count: input.count,
        start_position: input.startPosition,
      },
      body: { envelopeIds },
    });
  },
};

export default envelopeStatusList;
