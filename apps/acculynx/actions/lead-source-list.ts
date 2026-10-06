import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient } from "../lib/client.ts";
import { PAGED_OUTPUT, pageQuery, pagingParams } from "../lib/params.ts";

interface Input {
  pageSize?: number;
  startIndex?: number;
}

const action: ActionDefinition<Input> = {
  key: "lead-source-list",
  type: "read",
  resource: "company",
  title: "List Lead Sources",
  description: "List the company's active lead sources (with child sources); ids feed Create Job.",
  params: [
    ...pagingParams(),
  ],
  output: [...PAGED_OUTPUT],

  async execute(input, ctx) {
    return await new AccuLynxClient(ctx).get(
      "/company-settings/leads/lead-sources",
      pageQuery(input, "recordStartIndex"),
    );
  },
};

export default action;
