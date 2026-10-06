import type { ActionDefinition } from "@w6w/types";
import { encodeId, ThanksioClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /api/v2/mailing-lists-utils/recipients/{mailingListId}` — a bare Laravel paginator
 * (`data`, `current_page`, `next_page_url`, `total`, …), unlike the `data/links/meta` lists.
 */
interface Input {
  mailingListId: string;
  limit?: number;
  updatedSince?: string;
}

const mailingListRecipientsList: ActionDefinition<Input> = {
  key: "mailing-list-recipients-list",
  type: "read",
  resource: "recipient",
  title: "List Mailing List Recipients",
  description: "List the recipients of a mailing list, optionally only those updated since a " +
    "given time.",
  params: [
    idParam("mailingListId", "Mailing list ID"),
    {
      key: "limit",
      label: "Results per page",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    {
      key: "updatedSince",
      label: "Updated since",
      type: "string",
      hint: "YYYY-MM-DD HH:MM:SS",
    },
  ],
  output: [
    { key: "recipients", type: "array", label: "Recipients" },
    { key: "currentPage", type: "number", label: "Current page" },
    { key: "nextPageUrl", type: "string", label: "Next page URL (null on the last page)" },
    { key: "total", type: "number", label: "Total recipients" },
  ],

  async execute(input, ctx) {
    const body = await new ThanksioClient(ctx).call<
      {
        data?: unknown[];
        current_page?: number;
        next_page_url?: string | null;
        total?: number;
      }
    >(`/mailing-lists-utils/recipients/${encodeId(input.mailingListId)}`, {
      query: { limit: input.limit, updated_since: input.updatedSince },
    });
    return {
      recipients: body.data ?? [],
      currentPage: body.current_page,
      nextPageUrl: body.next_page_url ?? null,
      total: body.total,
    };
  },
};

export default mailingListRecipientsList;
