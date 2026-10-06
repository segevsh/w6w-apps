import type { ActionDefinition } from "@w6w/types";
import { ThanksioClient } from "../lib/client.ts";
import { itemsPerPageParam, MAILER_TYPES, subAccountIdFilterParam } from "../lib/params.ts";

/** `GET /api/v2/image-templates/` — `data` / `links` / `meta` envelope. */
interface Input {
  itemsPerPage?: number;
  subAccountId?: number;
  type?: string;
}

const imageTemplateList: ActionDefinition<Input> = {
  key: "image-template-list",
  type: "read",
  resource: "image-template",
  title: "List Image Templates",
  description: "List the image templates on the account, optionally for one mailer type or " +
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
    { key: "imageTemplates", type: "array", label: "Image Templates" },
    { key: "links", type: "object", label: "Pagination links" },
    { key: "meta", type: "object", label: "Pagination meta" },
  ],

  async execute(input, ctx) {
    const body = await new ThanksioClient(ctx).call<
      { data?: unknown[]; links?: unknown; meta?: unknown }
    >("/image-templates/", {
      query: {
        items_per_page: input.itemsPerPage,
        sub_account_id: input.subAccountId,
        type: input.type,
      },
    });
    return { imageTemplates: body.data ?? [], links: body.links, meta: body.meta };
  },
};

export default imageTemplateList;
