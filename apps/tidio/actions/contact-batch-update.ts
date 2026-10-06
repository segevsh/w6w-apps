import type { ActionDefinition } from "@w6w/types";
import { call, contactBody, parseJson, pick } from "../lib/client.ts";
import { json } from "../lib/params.ts";

/** `PATCH /contacts/batch` (1-100, all-or-nothing) -> 204. */
type Input = { contacts: unknown };

const contactBatchUpdate: ActionDefinition<Input> = {
  key: "contact-batch-update",
  type: "perform",
  resource: "contact",
  title: "Update Multiple Contacts",
  description:
    "Update up to 100 contacts in one call. All-or-nothing: if any update is invalid, none are applied.",
  idempotent: true,
  params: [
    json("contacts", "Contacts", {
      required: true,
      hint:
        'Array of 1-100 updates, each with the contact "id": [{"id":"<uuid>","phone":"+48123456789"}].',
    }),
  ],
  output: [
    { key: "updated", type: "boolean", label: "True when Tidio accepted the batch" },
    { key: "count", type: "number", label: "Number of contacts in the batch" },
  ],
  async execute(input, ctx) {
    const list = parseJson(input.contacts, "contacts");
    if (!Array.isArray(list) || list.length < 1 || list.length > 100) {
      throw new Error("contacts must be an array of 1-100 contact updates");
    }
    const contacts = list.map((c, i) => {
      const id = (c as { id?: unknown })?.id;
      if (typeof id !== "string" || !id) throw new Error(`contacts[${i}] needs an id`);
      return { id, ...pick(c as object, ["distinct_id"]), ...contactBody(c as object) };
    });
    await call(ctx, "PATCH", "/contacts/batch", { body: { contacts } });
    return { updated: true, count: contacts.length };
  },
};

export default contactBatchUpdate;
