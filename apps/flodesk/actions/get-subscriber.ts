import type { ActionDefinition } from "@w6w/types";
import { FlodeskClient } from "../lib/client.ts";

interface Input {
  idOrEmail: string;
}

/**
 * Flodesk's path parameter is literally named `{id_or_email}` — one endpoint
 * accepts either identifier, so no separate lookup-by-email action is needed
 * (and none is invented). The value is percent-encoded, which matters because
 * an email address carries an `@` and may carry a `+`.
 */
const getSubscriber: ActionDefinition<Input> = {
  key: "get-subscriber",
  type: "read",
  resource: "subscriber",
  title: "Get Subscriber",
  description:
    "Return one subscriber by Flodesk id or by email address: status, name, source, custom field values and segment membership.",
  params: [
    {
      key: "idOrEmail",
      label: "Subscriber ID or email",
      type: "string",
      required: true,
      placeholder: "name@email.com",
      hint: "Either the Flodesk subscriber id or the subscriber's email address.",
    },
  ],
  output: [{ key: "subscriber", type: "object", label: "Subscriber" }],

  execute(input, ctx) {
    return new FlodeskClient(ctx).request(
      `/subscribers/${FlodeskClient.seg(input.idOrEmail)}`,
    );
  },
};

export default getSubscriber;
