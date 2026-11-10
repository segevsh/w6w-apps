import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listAutomations from "../actions/list-automations.ts";

/**
 * `list-automations`: `GET /automations?orders[mdate]=DESC&limit=20` — ActiveCampaign documents `orders[mdate]`
 * (https://developers.activecampaign.com/reference/list-all-automations, verified 2026-11-10), so page 1 is the newest modified automations.
 */
export default pollFromListAction({
  key: "new-or-updated-automation",
  title: "New or Updated Automation",
  description:
    "The run gets each automation created or modified in ActiveCampaign. An edit emits the automation again.",
  action: listAutomations,
  input: () => ({ orderBy: "mdate", orderDirection: "DESC", limit: 20 }),
  items: (r) => ((r as { automations?: unknown[] }).automations) ?? [],
  idOf: (item) => `${(item as { id: string }).id}:${(item as { mdate?: string }).mdate ?? ""}`,
  output: [
    { key: "id", type: "string", label: "Automation ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "cdate", type: "string", label: "Created" },
    { key: "mdate", type: "string", label: "Modified" },
  ],
  sample: {
    id: "5",
    name: "Welcome series",
    status: "1",
    cdate: "2026-11-10T09:00:00-06:00",
    mdate: "2026-11-10T10:00:00-06:00",
  },
});
