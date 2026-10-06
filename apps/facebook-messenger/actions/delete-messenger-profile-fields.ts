import type { ActionDefinition } from "@w6w/types";
import { MessengerClient, requireString } from "../lib/client.ts";

interface Input {
  fields: string;
}

/**
 * Delete Messenger Profile properties — `DELETE /me/messenger_profile` with
 * `{ "fields": [...] }` in the JSON body. Only the named properties are removed; deleting
 * `ice_breakers` removes ALL of them (per-locale deletion is not available).
 */
const deleteMessengerProfileFields: ActionDefinition<
  Input,
  { result?: string; success?: unknown }
> = {
  key: "delete-messenger-profile-fields",
  type: "perform",
  resource: "profile",
  title: "Delete Messenger Profile Properties",
  description: "Remove properties such as the greeting, ice breakers or persistent menu.",
  idempotent: true,
  params: [
    {
      key: "fields",
      label: "Properties",
      type: "string",
      required: true,
      hint: "Comma-separated, e.g. persistent_menu,ice_breakers.",
    },
  ],
  output: [{ key: "result", type: "string", label: "Result (success)" }],

  execute(input, ctx) {
    const fields = requireString("fields", input.fields).split(",").map((f) => f.trim()).filter(
      Boolean,
    );
    if (fields.length === 0) throw new Error("fields is required");
    return new MessengerClient(ctx).request<{ result?: string; success?: unknown }>(
      "/me/messenger_profile",
      { method: "DELETE", body: { fields } },
    );
  },
};

export default deleteMessengerProfileFields;
