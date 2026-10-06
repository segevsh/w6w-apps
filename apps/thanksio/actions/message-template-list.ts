import type { ActionDefinition } from "@w6w/types";
import { ThanksioClient } from "../lib/client.ts";
import { itemsPerPageParam, MAILER_TYPES, subAccountIdFilterParam } from "../lib/params.ts";

/** `GET /api/v2/message-templates/` — `data` / `links` / `meta` envelope. */
interface Input {
  itemsPerPage?: number;
  subAccountId?: number;
  type?: string;
}

const messageTemplateList: ActionDefinition<Input> = {
  key: "message-template-list",
  type: "read",
  resource: "message-template",
  title: "List Message Templates",
  description: "List the message templates on the account, optionally for one mailer type or " +
    "sub-account. Use a template of the matching mailer type when sending.",
  params: [
    itemsPerPageParam,
    subAccountIdFilterParam,
    {
      key: "type",
      label: "Mailer type",
      type: "select",
      options: MAILER_TYPES.map((t) => ({ value: t, label: t })),
      hint: "`postcard` is 4x6.",
    },
  ],
  output: [
    { key: "messageTemplates", type: "array", label: "Message Templates" },
    { key: "links", type: "object", label: "Pagination links" },
    { key: "meta", type: "object", label: "Pagination meta" },
  ],

  async execute(input, ctx) {
    const body = await new ThanksioClient(ctx).call<
      { data?: unknown[]; links?: unknown; meta?: unknown }
    >("/message-templates/", {
      query: {
        items_per_page: input.itemsPerPage,
        sub_account_id: input.subAccountId,
        type: input.type,
      },
    });
    return { messageTemplates: body.data ?? [], links: body.links, meta: body.meta };
  },
};

export default messageTemplateList;
