import type { ActionDefinition } from "@w6w/types";
import { DubClient, seg } from "../lib/client.ts";
import {
  LINK_FIELD_PARAMS,
  LINK_OUTPUT,
  linkBody,
  type LinkFields,
  urlParam,
} from "../lib/links.ts";

type Input = LinkFields & { linkId: string };

/** `PATCH /links/{linkId}` — only the fields you send change. */
const linkUpdate: ActionDefinition<Input> = {
  key: "link-update",
  type: "perform",
  resource: "link",
  title: "Update Link",
  description: "Update a short link by ID. Only the fields you set are changed.",
  idempotent: true,
  params: [
    {
      key: "linkId",
      label: "Link ID",
      type: "string",
      required: true,
      hint: "The link's ID, or its external ID prefixed with `ext_`.",
    },
    urlParam(false),
    ...LINK_FIELD_PARAMS,
  ],
  output: LINK_OUTPUT,

  execute(input, ctx) {
    return new DubClient(ctx).request("PATCH", `/links/${seg(input.linkId)}`, {
      body: linkBody(input),
    });
  },
};

export default linkUpdate;
