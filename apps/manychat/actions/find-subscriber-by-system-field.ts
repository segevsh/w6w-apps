import type { ActionDefinition } from "@w6w/types";
import { ManychatClient, type ManychatEnvelope, type ManychatSubscriber } from "../lib/client.ts";

interface Input {
  email?: string;
  phone?: string;
}

/**
 * Find **one** subscriber by email address or phone number.
 *
 * `GET /fb/subscriber/findBySystemField?email=…` or `?phone=…` →
 * `{ status, data: Subscriber }` — a **single object**, not an array, unlike the
 * other two finders. That is the whole point: email and phone are identities in
 * Manychat, names are not.
 *
 * The spec's description is one sentence and it is a rule, not a hint:
 *
 *     "***Limit:*** 50 queries per second.<br>Set one parameter: Email OR Phone."
 *
 * Both parameters are optional in the schema and neither is marked required, so
 * the API cannot express "exactly one" — this action enforces it. Sending both is
 * refused rather than resolved by precedence: the two could identify different
 * people, and quietly picking one would make an ambiguous lookup look decisive.
 * Sending neither is refused because it would be a request for "any subscriber".
 *
 * At 50 queries per second this is the fastest subscriber lookup published (the
 * others are 10/s), which makes it the right join key when a workflow is matching
 * a CRM record or an order against a chat audience.
 */
const findSubscriberBySystemField: ActionDefinition<Input> = {
  key: "find-subscriber-by-system-field",
  type: "search",
  resource: "subscriber",
  title: "Find Subscriber by Email or Phone",
  description:
    "Find one subscriber by email OR phone (GET /fb/subscriber/findBySystemField). Returns a " +
    "single object, not a list. Exactly one of the two must be supplied.",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Supply this or the phone number, never both.",
    },
    {
      key: "phone",
      label: "Phone",
      type: "string",
      hint: "Supply this or the email, never both.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "data", type: "object", label: "Subscriber" },
  ],

  execute(input, ctx) {
    const hasEmail = !!input.email;
    const hasPhone = !!input.phone;
    if (hasEmail === hasPhone) {
      throw new Error(
        "find-subscriber-by-system-field takes exactly one of email or phone — Manychat's own " +
          'documentation says "Set one parameter: Email OR Phone".',
      );
    }

    return new ManychatClient(ctx).get<ManychatEnvelope<ManychatSubscriber>>(
      "/fb/subscriber/findBySystemField",
      hasEmail ? { email: input.email } : { phone: input.phone },
    );
  },
};

export default findSubscriberBySystemField;
