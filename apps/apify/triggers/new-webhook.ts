import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/webhook-list.ts";
import { idOf, itemsOf, NEWEST_FIRST } from "../lib/triggers.ts";

// GET /webhooks?desc=1&limit=100&offset=0 — "Get list of webhooks": "desc: if true or 1 then the
// objects are sorted by the createdAt field in descending order. By default, they are sorted in
// ascending order." https://docs.apify.com/api/v2/webhooks-get
// The vendor includes each webhook's header template, which may hold secrets the user configured;
// it is dropped here so it never reaches a run's event.
export default pollFromListAction({
  key: "new-webhook",
  title: "New Webhook",
  description:
    "The run gets each webhook newly created on the account (without its header template).",
  action,
  input: () => ({ ...NEWEST_FIRST }),
  items: (result) =>
    itemsOf(result).map((item) => {
      const { headersTemplate: _headers, ...rest } = item as Record<string, unknown>;
      return rest;
    }),
  idOf,
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "requestUrl", type: "string", label: "Request URL" },
    { key: "eventTypes", type: "array", label: "Event types" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "webhook-101",
    requestUrl: "https://example.com/hook",
    eventTypes: ["ACTOR.RUN.SUCCEEDED"],
    createdAt: "2026-11-09T10:00:00.000Z",
  },
  maxPages: 1,
});
