import type { ActionDefinition } from "@w6w/types";
import { compact, LushaClient, strList } from "../lib/client.ts";

interface Input {
  ids: string | string[];
}

const action: ActionDefinition<Input> = {
  key: "subscription-delete",
  type: "perform",
  resource: "subscription",
  title: "Delete Webhook Subscriptions",
  description: "Delete up to 25 webhook subscriptions by id; partial success is reported per id.",
  idempotent: true,
  params: [
    { key: "ids", label: "Subscription IDs", type: "string", required: true, hint: "Up to 25." },
  ],
  output: [
    { key: "results", type: "array", label: "Per-id result" },
  ],

  execute(input, ctx) {
    return new LushaClient(ctx).request("POST", `/api/subscriptions/delete`, {
      body: compact({ ids: strList(input.ids) }),
    });
  },
};

export default action;
