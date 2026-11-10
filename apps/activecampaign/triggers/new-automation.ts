import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listAutomations from "../actions/list-automations.ts";

/**
 * `list-automations`: `GET /automations?orders[cdate]=DESC&limit=20` — ActiveCampaign documents `orders[cdate]`
 * (https://developers.activecampaign.com/reference/list-all-automations, verified 2026-11-10), so page 1 is the newest created automations.
 */
export default pollFromListAction({
  key: "new-automation",
  title: "New Automation",
  description: "The run gets each automation newly created in ActiveCampaign.",
  action: listAutomations,
  input: () => ({ orderBy: "cdate", orderDirection: "DESC", limit: 20 }),
  items: (r) => ((r as { automations?: unknown[] }).automations) ?? [],
  idOf: (item) => String((item as { id: string | number }).id),
  output: [
    { key: "id", type: "string", label: "Automation ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "cdate", type: "string", label: "Created" },
  ],
  sample: { id: "5", name: "Welcome series", status: "1", cdate: "2026-11-10T09:00:00-06:00" },
});
