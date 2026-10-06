import type { ActionDefinition } from "@w6w/types";
import { asObject, compact, RefinerClient } from "../lib/client.ts";

interface Input {
  id?: string;
  email?: string;
  traits?: unknown;
  account?: unknown;
}

const contactIdentify: ActionDefinition<Input> = {
  key: "contact-identify",
  type: "perform",
  resource: "contact",
  title: "Identify User",
  description:
    "Create or update a contact and its traits (the backend twin of the JavaScript client's " +
    "identify). Calls with the same user id update the existing contact. Optionally group the " +
    "user under an account.",
  idempotent: true,
  params: [
    { key: "id", label: "User ID", type: "string", hint: "Required unless an email is given." },
    { key: "email", label: "Email", type: "string", hint: "Alternative to the user id." },
    {
      key: "traits",
      label: "Traits",
      type: "json",
      hint: 'Object of trait slug to value, e.g. {"plan":"pro","created_at":"2026-01-02"}. ' +
        "Slugs ending in `_at` are parsed as dates; unquoted numbers and booleans keep their " +
        "type; strings are capped at 255 characters.",
    },
    {
      key: "account",
      label: "Account",
      type: "json",
      hint: 'Nested account object to group users, e.g. {"id":"acme","name":"Acme Inc."}. ' +
        "`id` is required inside it.",
    },
  ],
  output: [
    { key: "message", type: "string", label: "`ok` on success" },
    { key: "contact_uuid", type: "string", label: "Refiner contact UUID" },
  ],

  async execute(input, ctx) {
    const id = input.id?.trim();
    const email = input.email?.trim();
    if (!id && !email) throw new Error("provide a user id or an email");
    const account = asObject(input.account, "account");
    if (account && (account.id === undefined || account.id === "")) {
      throw new Error("account.id is required when an account is given");
    }
    // Reserved identifiers win over anything a traits object tries to set.
    const body = {
      ...(asObject(input.traits, "traits") ?? {}),
      ...compact({ id, email }),
      ...(account ? { account } : {}),
    };
    return await new RefinerClient(ctx).json("/identify-user", { method: "POST", body });
  },
};

export default contactIdentify;
