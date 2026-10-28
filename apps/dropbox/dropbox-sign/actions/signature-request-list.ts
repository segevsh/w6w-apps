import type { ActionDefinition } from "@w6w/types";
import { DropboxSignClient } from "../lib/client.ts";
import { ACCOUNT_ID_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /signature_request/list` — verified against the official OpenAPI
 * document (`signatureRequestList`).
 *
 * The `query` parameter is Dropbox Sign's own search grammar, not a substring
 * match: `complete:true`, `from:ada@example.com`, `created:{7 days ago}`. It is
 * passed through verbatim rather than wrapped, because inventing a friendlier
 * shape on top would quietly reject valid searches.
 */
const action: ActionDefinition = {
  key: "signature-request-list",
  type: "read",
  resource: "signature-request",
  title: "List signature requests",
  description: "List signature requests, optionally filtered by Dropbox Sign's search syntax.",
  params: [
    ACCOUNT_ID_PARAM,
    {
      key: "query",
      label: "Search Query",
      type: "string",
      default: "",
      placeholder: "complete:false AND from:ada@example.com",
      hint: "Dropbox Sign's search syntax — `complete:`, `from:`, `to:`, `title:`, `created:`.",
    },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Dropbox Sign signature requests", { returnAll, limit });

    return await new DropboxSignClient(ctx).requestAll(
      "/signature_request/list",
      "signature_requests",
      {
        query: {
          account_id: (p.accountId as string) || undefined,
          query: (p.query as string) || undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
