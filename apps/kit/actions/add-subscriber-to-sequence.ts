import type { ActionDefinition } from "@w6w/types";
import { KitClient } from "../lib/client.ts";

interface Input {
  sequenceId: number;
  emailAddress: string;
}

const addSubscriberToSequence: ActionDefinition<Input> = {
  key: "add-subscriber-to-sequence",
  type: "perform",
  resource: "sequence",
  title: "Add Subscriber To Sequence",
  description:
    "Add an existing subscriber to a sequence by email address. Kit requires the subscriber to exist already — create them with Create Subscriber first, or this returns 404.",
  idempotent: true,
  params: [
    { key: "sequenceId", label: "Sequence ID", type: "number", required: true },
    {
      key: "emailAddress",
      label: "Email address",
      type: "string",
      required: true,
      placeholder: "name@email.com",
    },
  ],
  output: [{ key: "subscriber", type: "object", label: "Subscriber" }],

  execute(input, ctx) {
    return new KitClient(ctx).request(`/sequences/${input.sequenceId}/subscribers`, {
      method: "POST",
      body: { email_address: input.emailAddress },
    });
  },
};

export default addSubscriberToSequence;
