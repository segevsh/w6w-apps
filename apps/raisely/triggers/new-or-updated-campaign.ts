import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/campaign-list.ts";

export default pollFromListAction({
  key: "new-or-updated-campaign",
  title: "New or Updated Campaign",
  description: "The run gets each campaign that is new or was updated since the last check.",
  action,
  input: () => ({ sort: "updatedAt", order: "desc", limit: 100, offset: 0 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    `${(item as { uuid?: string }).uuid}:${(item as { updatedAt?: string }).updatedAt}`,
  output: [{ key: "uuid", type: "string", label: "Campaign ID" }, {
    key: "updatedAt",
    type: "string",
    label: "Updated at",
  }],
  sample: { uuid: "campaign-1", name: "Fundraiser", updatedAt: "2026-11-09T10:00:00.000Z" },
  maxPages: 1,
});
