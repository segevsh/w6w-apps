import type { ActionDefinition } from "@w6w/types";
import { HibobClient } from "../lib/client.ts";

/** `GET /v1/company/reports` — the company's reports, filtered to what the service user may access. */
const reportsList: ActionDefinition<Record<string, never>> = {
  key: "reports-list",
  type: "read",
  resource: "report",
  title: "List Reports",
  description: "List company reports with their configuration.",
  params: [],
  output: [{ key: "views", type: "object", label: "Reports (id, name, configuration)" }],

  async execute(_input, ctx) {
    return await new HibobClient(ctx).get("/company/reports");
  },
};

export default reportsList;
