import type { ActionDefinition } from "@w6w/types";
import { coerceFieldValue, ManychatClient, type ManychatEnvelope } from "../lib/client.ts";

interface Input {
  fieldId?: string;
  fieldName?: string;
  value: string;
}

/**
 * Set one Page-global bot field's value.
 *
 * Two endpoints, one action: `POST /fb/page/setBotField` (`{ field_id,
 * field_value }`) and `POST /fb/page/setBotFieldByName` (`{ field_name,
 * field_value }`). Identical semantics, so the action takes whichever identifier
 * the workflow holds and routes accordingly — the same shape as
 * `add-subscriber-tag` and `set-subscriber-field`.
 *
 * Exactly one identifier is required. Unlike `delete-tag`, getting this wrong is
 * recoverable — but it is still refused rather than resolved by precedence,
 * because a caller passing both has a bug and silently writing to one of two
 * different fields is a bad way to find out.
 *
 * `idempotent: true`. This is a write of an absolute value, not an increment:
 * running it twice with the same input leaves the Page in exactly the state one
 * run would. That is what makes it safe for the host to retry after a timeout.
 */
const setBotField: ActionDefinition<Input> = {
  key: "set-bot-field",
  type: "perform",
  idempotent: true,
  resource: "bot-field",
  title: "Set Bot Field",
  description: "Set one Page-global bot field by id or by name (POST /fb/page/setBotField or " +
    "/fb/page/setBotFieldByName). Absolute write — safe to retry.",
  params: [
    {
      key: "fieldId",
      label: "Field ID",
      type: "string",
      hint: "From List Bot Fields. Supply this or the field name, not both.",
    },
    { key: "fieldName", label: "Field name", type: "string" },
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
      throw new Error("set-bot-field needs exactly one of fieldId or fieldName");
    }

    const field_value = coerceFieldValue(input.value);
    return hasId
      ? client.post<ManychatEnvelope>("/fb/page/setBotField", {
        field_id: Number(input.fieldId),
        field_value,
      })
      : client.post<ManychatEnvelope>("/fb/page/setBotFieldByName", {
        field_name: input.fieldName,
        field_value,
      });
  },
};

export default setBotField;
