import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient } from "../lib/client.ts";
import { includesParam, PAGED_OUTPUT, pageQuery, pagingParams } from "../lib/params.ts";

interface Input {
  pageSize?: number;
  startIndex?: number;
  includes?: string;
}

const action: ActionDefinition<Input> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description:
    "List contacts. Phone numbers and email addresses come back as links unless expanded with includes.",
  params: [
    ...pagingParams(),
    includesParam("emailAddress, phoneNumber"),
  ],
  output: [...PAGED_OUTPUT],

  async execute(input, ctx) {
    return await new AccuLynxClient(ctx).get("/contacts", {
      ...pageQuery(input, "pageStartIndex"),
      includes: input.includes,
    });
  },
};

export default action;
