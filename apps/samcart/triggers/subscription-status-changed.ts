import type { TriggerDefinition } from "@w6w/types";
import { sinceTrigger } from "../lib/triggers.ts";
import subscriptionHistoryList from "../actions/subscription-history-list.ts";

const trigger: TriggerDefinition = sinceTrigger({
  key: "subscription-status-changed",
  title: "Subscription Status Changed",
  description:
    "The run gets each new status change on the chosen subscription (canceled, paused, delinquent, ...).",
  action: subscriptionHistoryList,
  stampField: "change_date",
  paged: false,
  params: [
    {
      key: "subscriptionId",
      label: "Subscription ID",
      type: "number",
      required: true,
      hint: "The SamCart subscription to watch.",
      validation: { integer: true, min: 1 },
    },
  ],
  input: (params) => ({ subscriptionId: params.subscriptionId }),
  output: [
    { key: "id", type: "number", label: "History record ID" },
    { key: "subscription_id", type: "number", label: "Subscription ID" },
    { key: "new_status", type: "string", label: "New status" },
    { key: "source", type: "string", label: "Source of the change" },
    { key: "type", type: "string", label: "Type of change" },
    { key: "change_date", type: "string", label: "Changed at (UTC)" },
  ],
  sample: {
    id: 1337,
    subscription_id: 1001,
    new_status: "canceled",
    source: "dashboard",
    type: "status",
    change_date: "2026-11-10 09:15:00",
  },
});
export default trigger;
