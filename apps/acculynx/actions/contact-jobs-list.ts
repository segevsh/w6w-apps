import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient, encodeId } from "../lib/client.ts";
import { idParam, PAGED_OUTPUT, pageQuery, pagingParams } from "../lib/params.ts";

interface Input {
  contactId: string;
  pageSize?: number;
  startIndex?: number;
}

const action: ActionDefinition<Input> = {
  key: "contact-jobs-list",
  type: "read",
  resource: "contact",
  title: "List Contact Jobs",
  description: "List the jobs a contact belongs to (ids and links).",
  params: [
    idParam("contactId", "Contact id"),
    ...pagingParams(),
  ],
  output: [...PAGED_OUTPUT],

  async execute(input, ctx) {
    return await new AccuLynxClient(ctx).get(
      `/contacts/${encodeId(input.contactId)}/jobs`,
      pageQuery(input, "recordStartIndex"),
    );
  },
};

export default action;
