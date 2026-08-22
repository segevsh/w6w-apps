import type { ActionDefinition } from "@w6w/types";
import { DropboxSignClient } from "../lib/client.ts";
import { ACCOUNT_ID_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /template/list` — verified against the official OpenAPI document
 * (`templateList`).
 */
const action: ActionDefinition = {
  key: "template-list",
  type: "read",
  resource: "template",
  title: "List templates",
  description: "List the reusable templates this account can send.",
  params: [
    ACCOUNT_ID_PARAM,
    {
      key: "query",
      label: "Search Query",
      type: "string",
      default: "",
      hint: "Dropbox Sign's search syntax, same grammar as the signature request list.",
    },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Dropbox Sign templates", { returnAll, limit });

    return await new DropboxSignClient(ctx).requestAll(
      "/template/list",
      "templates",
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
