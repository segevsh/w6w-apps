import type { ActionDefinition } from "@w6w/types";
import { coerceFieldValue, ManychatClient, type ManychatEnvelope } from "../lib/client.ts";

interface Input {
  subscriberId: string;
  fieldId?: string;
  fieldName?: string;
  value: string;
}

/**
 * Set one custom field on one subscriber.
 *
 * `POST /fb/subscriber/setCustomField` (`{ subscriber_id, field_id,
 * field_value }`) or `POST /fb/subscriber/setCustomFieldByName`
 * (`{ subscriber_id, field_name, field_value }`).
 *
 * The by-name variant carries a documented nicety the id variant does not:
 * `field_name` is annotated **"not case sensitive"** in the spec. So `"Plan"` and
 * `"plan"` hit the same field, and a workflow does not have to match Manychat's
 * capitalisation exactly.
 *
 * ## Field must already exist
 *
 * There is no upsert. Setting a field that has not been defined on the Page is an
 * error, not an implicit create — `create-custom-field` is the only way to define
 * one, and its type is fixed at that moment. This matters because a `boolean`
 * field silently receiving the string `"true"` is exactly the bug
 * `coerceFieldValue` exists to prevent: `"true"`/`"false"` are sent as booleans
 * and canonical integers as numbers, while dates and anything with a leading zero
 * stay text.
 *
 * `idempotent: true` — an absolute write.
 */
const setSubscriberField: ActionDefinition<Input> = {
  key: "set-subscriber-field",
  type: "perform",
  idempotent: true,
  resource: "subscriber",
  title: "Set Subscriber Field",
  description: "Set one custom field on one subscriber, by field id or name " +
    "(POST /fb/subscriber/setCustomField or /fb/subscriber/setCustomFieldByName). Field names " +
    "are not case sensitive. The field must already exist.",
  params: [
    { key: "subscriberId", label: "Subscriber ID", type: "string", required: true },
    {
      key: "fieldId",
      label: "Field ID",
      type: "string",
      hint: "From List Custom Fields. Supply this or the field name, not both.",
    },
    {
      key: "fieldName",
      label: "Field name",
      type: "string",
      hint: "Not case sensitive, per Manychat's schema annotation.",
    },
    {
      key: "value",
      label: "Value",
      type: "string",
      required: true,
      hint: "`true`/`false` and plain integers are sent as boolean/number; dates stay strings.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const client = new ManychatClient(ctx);
    const hasId = !!input.fieldId;
    const hasName = !!input.fieldName;
    if (hasId === hasName) {
      throw new Error("set-subscriber-field needs exactly one of fieldId or fieldName");
    }

    const field_value = coerceFieldValue(input.value);
    return hasId
      ? client.post<ManychatEnvelope>("/fb/subscriber/setCustomField", {
        subscriber_id: input.subscriberId,
        field_id: Number(input.fieldId),
        field_value,
      })
      : client.post<ManychatEnvelope>("/fb/subscriber/setCustomFieldByName", {
        subscriber_id: input.subscriberId,
        field_name: input.fieldName,
        field_value,
      });
  },
};

export default setSubscriberField;
