import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/campaign-list.ts";

export default pollFromListAction({
  key: "new-campaign",
  title: "New Campaign",
  description: "The run gets each newly created campaign.",
  action,
  input: () => ({ sort: "createdAt", order: "desc", limit: 100, offset: 0 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { uuid?: unknown }).uuid ?? ""),
  output: [{ key: "uuid", type: "string", label: "Campaign ID" }],
  sample: { uuid: "campaign-1", name: "Fundraiser" },
  maxPages: 1,
});
