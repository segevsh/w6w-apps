import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient } from "../lib/client.ts";
import { PAGED_OUTPUT, pageQuery, pagingParams } from "../lib/params.ts";

interface Input {
  pageSize?: number;
  startIndex?: number;
}

const action: ActionDefinition<Input> = {
  key: "calendar-list",
  type: "read",
  resource: "calendar",
  title: "List Calendars",
  description: "List the company's calendars; their ids feed the appointment actions.",
  params: [
    ...pagingParams(),
  ],
  output: [...PAGED_OUTPUT],

  async execute(input, ctx) {
    return await new AccuLynxClient(ctx).get("/calendars", pageQuery(input, "recordStartIndex"));
  },
};

export default action;
