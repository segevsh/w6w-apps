import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient } from "../lib/client.ts";
import { PAGED_OUTPUT, pageQuery, pagingParams } from "../lib/params.ts";

interface Input {
  pageSize?: number;
  startIndex?: number;
}

const action: ActionDefinition<Input> = {
  key: "contact-type-list",
  type: "read",
  resource: "contact",
  title: "List Contact Types",
  description: "List the company's contact types; ids feed Create Contact and Update Contact.",
  params: [
    ...pagingParams(),
  ],
  output: [...PAGED_OUTPUT],

  async execute(input, ctx) {
    return await new AccuLynxClient(ctx).get(
      "/contacts/contact-types",
      pageQuery(input, "pageStartIndex"),
    );
  },
};

export default action;
