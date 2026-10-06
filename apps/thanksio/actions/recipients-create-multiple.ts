import type { ActionDefinition } from "@w6w/types";
import { asJson, ThanksioClient } from "../lib/client.ts";

/**
 * `POST /api/v2/recipients-utils/create-multiple` — the request body is a bare JSON array of
 * recipient objects. The vendor's own example keys the list with `mailing_list`, while the
 * single-create endpoint uses `mailing_list_id`; the array is therefore passed through verbatim.
 */
interface Input {
  recipients: unknown;
}

const recipientsCreateMultiple: ActionDefinition<Input> = {
  key: "recipients-create-multiple",
  type: "perform",
  resource: "recipient",
  title: "Create Multiple Recipients",
  description: "Add many recipients at once from a JSON array. A recipient with an email but no " +
    "valid mailing address triggers a paid address lookup.",
  idempotent: false,
  params: [
    {
      key: "recipients",
      label: "Recipients",
      type: "json",
      required: true,
      hint: 'Array of recipient objects, e.g. [{"mailing_list":1,"name":"Ada","address":"1 Main ' +
        'St","city":"Lenexa","province":"KS","postal_code":"66216"}]. The vendor\'s own example ' +
        "names the list with `mailing_list`; field names are sent exactly as you give them.",
    },
  ],
  output: [
    { key: "recipients", type: "array", label: "The created recipients" },
  ],

  async execute(input, ctx) {
    const list = asJson<unknown[]>(input.recipients, "Recipients");
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error("Recipients must be a non-empty JSON array");
    }
    const body = await new ThanksioClient(ctx).call<unknown[]>(
      "/recipients-utils/create-multiple",
      { method: "POST", body: list },
    );
    return { recipients: Array.isArray(body) ? body : [] };
  },
};

export default recipientsCreateMultiple;
