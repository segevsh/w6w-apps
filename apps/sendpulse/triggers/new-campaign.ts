import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import campaignsList from "../actions/campaigns-list.ts";

/**
 * Newest-first poll (brief 9.1 a). `GET /campaigns` takes `order=asc|desc`; the vendor's operation
 * text says "Sort by date descending to see recent activity"
 * (https://api.sendpulse.com/.well-known/openapi/bulk-email.yaml, `getCampaigns`), so page 1 with
 * `order=desc` is read as the latest campaigns. The summary carries only id, name and status.
 */
export default pollFromListAction({
  key: "new-campaign",
  title: "New Campaign",
  description: "The run gets each email campaign newly created in the account.",
  action: campaignsList as unknown as ActionDefinition,
  input: () => ({ limit: 100, offset: 0, order: "desc" }),
  items: (res) => Array.isArray(res) ? res : (res as { data?: unknown[] })?.data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Campaign ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "number", label: "Status code" },
  ],
  sample: { id: 7001, name: "November newsletter", status: 13 },
});
