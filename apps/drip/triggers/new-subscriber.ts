import type { ActionDefinition } from "@w6w/types";
import listSubscribers from "../actions/list-subscribers.ts";
import { sinceTrigger } from "../lib/triggers.ts";

export default sinceTrigger({
  key: "new-subscriber",
  title: "New Subscriber",
  description: "The run gets each newly created Drip subscriber.",
  async load(since, _params, ctx) {
    const out: unknown[] = [];
    for (let page = 1; page <= 3; page++) {
      const result = await (listSubscribers as ActionDefinition).execute({
        status: "all",
        subscribedAfter: since,
        perPage: 100,
        page,
      }, ctx) as { subscribers?: unknown[] };
      const batch = result.subscribers ?? [];
      out.push(...batch);
      if (batch.length < 100) break;
    }
    return out;
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  stampOf: (item) => Date.parse(String((item as { created_at?: unknown }).created_at ?? "")) || 0,
  output: [
    { key: "id", type: "string", label: "Subscriber ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "tags", type: "array", label: "Tags" },
  ],
  sample: {
    id: "z1togz2hex8ehzbjhg5g",
    email: "john@acme.com",
    status: "active",
    created_at: "2026-11-09T10:00:00Z",
    tags: ["Customer"],
  },
});
