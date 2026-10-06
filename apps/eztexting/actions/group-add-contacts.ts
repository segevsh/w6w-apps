import type { ActionDefinition } from "@w6w/types";
import { asStringArray, encodePathSegment, EzTextingClient } from "../lib/client.ts";
import { groupIdParam, phoneNumbersParam } from "../lib/params.ts";

/**
 * `POST /v1/contact-groups/{id}/contacts?phoneNumbers=...` — the numbers travel in the QUERY string
 * (not a body), one `phoneNumbers` pair per number (the OpenAPI default `form`/`explode`
 * serialization; the spec states no style). Answers an array of strings.
 */
interface Input {
  id: string;
  phoneNumbers: string[] | string;
}

const groupAddContacts: ActionDefinition<Input> = {
  key: "group-add-contacts",
  type: "perform",
  resource: "group",
  title: "Add Contacts to Group",
  description: "Add contacts, by phone number, to a contact group.",
  idempotent: true,
  params: [groupIdParam, phoneNumbersParam()],
  output: [{ key: "result", type: "array", label: "Vendor response" }],

  async execute(input, ctx) {
    const phoneNumbers = asStringArray(input.phoneNumbers) ?? [];
    if (phoneNumbers.length === 0) throw new Error("phoneNumbers must list at least one number");
    const result = await new EzTextingClient(ctx).json<string[]>(
      `/contact-groups/${encodePathSegment(input.id)}/contacts`,
      { method: "POST", query: { phoneNumbers } },
    );
    return { result: Array.isArray(result) ? result : [] };
  },
};

export default groupAddContacts;
