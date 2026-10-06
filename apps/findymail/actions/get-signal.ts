import type { ActionDefinition } from "@w6w/types";
import { FindymailClient, seg } from "../lib/client.ts";

interface Input {
  id: number;
}

const getSignal: ActionDefinition<Input> = {
  key: "get-signal",
  type: "read",
  resource: "signal",
  title: "Get Signal",
  description: "Get one signal with its contact, company and the caller's monitors.",
  params: [{ "key": "id", "label": "Signal ID", "type": "number", "required": true }],
  output: [
    { "key": "id", "type": "number", "label": "Signal ID" },
    { "key": "type", "type": "string", "label": "Signal type" },
    { "key": "category", "type": "string", "label": "Category" },
    { "key": "payload", "type": "object", "label": "Payload" },
    { "key": "detected_at", "type": "string", "label": "Detected at" },
    { "key": "contact", "type": "object", "label": "Contact" },
    { "key": "company", "type": "object", "label": "Company" },
  ],

  async execute(input, ctx) {
    return await new FindymailClient(ctx).request("GET", `/api/signals/${seg(input.id)}`);
  },
};

export default getSignal;
