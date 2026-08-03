import type { ActionDefinition } from "@w6w/types";
import { KitClient } from "../lib/client.ts";

interface Input {
  subscriberId: number;
}

const getSubscriber: ActionDefinition<Input> = {
  key: "get-subscriber",
  type: "read",
  resource: "subscriber",
  title: "Get Subscriber",
  description:
    "Return one subscriber by id: first name, email address, state, creation date, and custom field values under `fields`. To look up by email instead, use List Subscribers with `emailAddress`.",
  params: [
    { key: "subscriberId", label: "Subscriber ID", type: "number", required: true },
  ],
  output: [{ key: "subscriber", type: "object", label: "Subscriber" }],

  execute(input, ctx) {
    return new KitClient(ctx).request(`/subscribers/${input.subscriberId}`);
  },
};

export default getSubscriber;
