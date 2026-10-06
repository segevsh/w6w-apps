import type { ActionDefinition } from "@w6w/types";
import { CleverReachClient, pathId } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "report-get",
  type: "read",
  resource: "report",
  title: "Get a report",
  description:
    "Fetch one report by id (`GET /v3/reports/{id}`); the id is the mailing id. A split-test version cannot be fetched directly: the vendor answers 403 naming the parent id to call instead.",
  params: [
    { key: "reportId", label: "Report (mailing) ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "item", type: "object", label: "The record as CleverReach returned it" },
  ],

  async execute(input, ctx) {
    return {
      item: await new CleverReachClient(ctx).request(
        `/reports/${pathId(input.reportId, "reportId")}`,
      ),
    };
  },
};

export default action;
