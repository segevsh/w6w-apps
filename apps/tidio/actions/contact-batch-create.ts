import type { ActionDefinition } from "@w6w/types";
import { call, cleanContact, contactBody, parseJson } from "../lib/client.ts";
import { json } from "../lib/params.ts";

/** `POST /contacts/batch` (1-100, all-or-nothing) -> 200 `{contacts}`. */
type Input = { contacts: unknown };

const contactBatchCreate: ActionDefinition<Input> = {
  key: "contact-batch-create",
  type: "perform",
  resource: "contact",
  title: "Create Multiple Contacts",
  description:
    "Create up to 100 contacts in one call. All-or-nothing: if any contact is invalid, none are saved.",
  idempotent: false,
  params: [
    json("contacts", "Contacts", {
      required: true,
      hint:
        'Array of 1-100 contacts, each with a required distinct_id: [{"distinct_id":"u1","email":"a@b.co"}].',
    }),
  ],
  output: [
    { key: "items", type: "array", label: "Created contacts" },
    { key: "count", type: "number", label: "Number created" },
  ],
  async execute(input, ctx) {
    const list = parseJson(input.contacts, "contacts");
    if (!Array.isArray(list) || list.length < 1 || list.length > 100) {
      throw new Error("contacts must be an array of 1-100 contacts");
    }
    const contacts = list.map((c, i) => {
      const distinct = (c as { distinct_id?: unknown })?.distinct_id;
      if (typeof distinct !== "string" || !distinct) {
        throw new Error(`contacts[${i}] needs a distinct_id`);
      }
      return { distinct_id: distinct, ...contactBody(c as object) };
    });
    const res = await call(ctx, "POST", "/contacts/batch", { body: { contacts } }) as
      | { contacts?: unknown[] }
      | null;
    const items = (res?.contacts ?? []).map(cleanContact);
    return { items, count: items.length };
  },
};

export default contactBatchCreate;
