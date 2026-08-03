import type { ActionDefinition } from "@w6w/types";
import { FlodeskClient } from "../lib/client.ts";

interface Input {
  email?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  customFields?: Record<string, string>;
  segmentIds?: string[];
  doubleOptin?: boolean;
  optinIp?: string;
  optinTimestamp?: string;
}

/**
 * `POST /v1/subscribers` — Flodesk's upsert. Its own summary is "Create or
 * update a subscriber", and it answers `200`, not `201`, which is the tell that
 * a repeat call converges on the same record rather than minting a second one.
 * Hence `idempotent: true`.
 *
 * Flodesk requires **either** `email` **or** `id` ("Either `email` or `id` must
 * be included"), which no single `required` flag can express — so neither field
 * is marked required and the pairing is enforced here, before the call.
 *
 * `double_optin` is documented as settable on creation only: "This option is
 * only available to set with new subscriber creation. Default to `false` if not
 * indicated."
 */
const createOrUpdateSubscriber: ActionDefinition<Input> = {
  key: "create-or-update-subscriber",
  type: "perform",
  resource: "subscriber",
  title: "Create or Update Subscriber",
  description:
    "Upsert a subscriber by email or id. An existing subscriber is updated in place rather than duplicated. Optionally add them to segments in the same call.",
  idempotent: true,
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      placeholder: "name@email.com",
      row: "identity",
      hint: "Required if `id` is not given.",
    },
    {
      key: "id",
      label: "Subscriber ID",
      type: "string",
      row: "identity",
      hint: "Required if `email` is not given. Use it to change an existing subscriber's email.",
    },
    { key: "firstName", label: "First name", type: "string", row: "name" },
    { key: "lastName", label: "Last name", type: "string", row: "name" },
    {
      key: "segmentIds",
      label: "Segment IDs",
      type: "json",
      hint: 'JSON array of segment ids, e.g. `["61b...","62c..."]`. Flodesk caps this at 50.',
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      hint:
        'JSON object keyed by each custom field\'s `key` (not its label), e.g. `{"favorite_color": "Lavender"}`. Values are strings.',
    },
    {
      key: "doubleOptin",
      label: "Double opt-in",
      type: "boolean",
      section: "collapsible",
      hint:
        "Require the subscriber to confirm by email. Honoured on creation only — ignored for an existing subscriber. Defaults to false.",
    },
    {
      key: "optinIp",
      label: "Opt-in IP",
      type: "string",
      hint: "IP address from which the subscriber confirmed their opt-in.",
    },
    {
      key: "optinTimestamp",
      label: "Opt-in timestamp",
      type: "datetime",
      hint: "ISO 8601, e.g. `2023-01-02T15:04:05.999Z`.",
    },
  ],
  output: [{ key: "subscriber", type: "object", label: "Subscriber" }],

  execute(input, ctx) {
    if (!input.email && !input.id) {
      throw new Error("Flodesk requires either `email` or `id` to identify the subscriber");
    }

    const body: Record<string, unknown> = {};
    if (input.email !== undefined) body.email = input.email;
    if (input.id !== undefined) body.id = input.id;
    if (input.firstName !== undefined) body.first_name = input.firstName;
    if (input.lastName !== undefined) body.last_name = input.lastName;
    if (input.customFields !== undefined) body.custom_fields = input.customFields;
    if (input.segmentIds !== undefined) body.segment_ids = input.segmentIds;
    if (input.doubleOptin !== undefined) body.double_optin = input.doubleOptin;
    if (input.optinIp !== undefined) body.optin_ip = input.optinIp;
    if (input.optinTimestamp !== undefined) body.optin_timestamp = input.optinTimestamp;

    return new FlodeskClient(ctx).request("/subscribers", { method: "POST", body });
  },
};

export default createOrUpdateSubscriber;
