import type { ActionDefinition } from "@w6w/types";
import { NinoxClient, seg } from "../lib/client.ts";

/** `GET /workspace/{workspaceId}/reports/{reportId}`. */
interface Input {
  reportId: string;
}

interface Output {
  report: unknown;
}

const reportGet: ActionDefinition<Input, Output> = {
  key: "report-get",
  type: "read",
  resource: "report",
  title: "Get Report",
  description: "Read one report's layout by its id.",
  params: [{ key: "reportId", label: "Report ID", type: "string", required: true }],
  output: [{ key: "report", type: "object", label: "Report" }],

  async execute(input, ctx) {
    return { report: await new NinoxClient(ctx).data(`/reports/${seg(input.reportId)}`) };
  },
};

export default reportGet;
