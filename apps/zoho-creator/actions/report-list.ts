import type { ActionDefinition } from "@w6w/types";
import { environmentHeaders, ZohoCreatorClient } from "../lib/client.ts";
import { accountOwnerName, appLinkName, environmentParam } from "../lib/params.ts";

interface Input {
  accountOwnerName: string;
  appLinkName: string;
  environment?: string;
}

interface Output {
  reports: Array<Record<string, unknown>>;
}

/**
 * `GET /creator/v2/meta/<owner>/<app>/reports` — Get Reports. Needs
 * `ZohoCreator.meta.application.READ`. Each returned report's `link_name` is the
 * `reportLinkName` param `record-list`/`record-update`/`record-delete`/
 * `file-upload`/`file-download` expect. Verified against `get-reports.html`.
 */
const reportList: ActionDefinition<Input, Output> = {
  key: "report-list",
  type: "read",
  resource: "report",
  title: "List Reports",
  description: "List every report in a Zoho Creator application.",
  params: [accountOwnerName, appLinkName, environmentParam],
  output: [{ key: "reports", type: "array", label: "Reports" }],

  async execute(input, ctx) {
    const data = await new ZohoCreatorClient(ctx).request<
      { reports?: Array<Record<string, unknown>> }
    >(
      `/meta/${encodeURIComponent(input.accountOwnerName)}/${
        encodeURIComponent(input.appLinkName)
      }/reports`,
      { headers: environmentHeaders(input) },
    );
    return { reports: data.reports ?? [] };
  },
};

export default reportList;
