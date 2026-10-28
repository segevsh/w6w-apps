import type { ActionDefinition } from "@w6w/types";
import { jsonParam, MessengerClient } from "../lib/client.ts";

interface Input {
  properties: unknown;
}

/**
 * Set any Messenger Profile properties — `POST /me/messenger_profile`. Only the properties
 * in the body are overwritten. This is the escape hatch for properties without a dedicated
 * action here: `get_started`, `whitelisted_domains`, `account_linking_url`, `commands`.
 *
 * Idempotent: it overwrites, so a retry leaves the same state.
 */
const setMessengerProfile: ActionDefinition<Input, { result: string }> = {
  key: "set-messenger-profile",
  type: "perform",
  resource: "profile",
  title: "Set Messenger Profile",
  description: "Set one or more Messenger Profile properties (Get Started, allowlisted domains …).",
  idempotent: true,
  params: [
    {
      key: "properties",
      label: "Properties (JSON object)",
      type: "json",
      required: true,
      hint:
        'e.g. {"whitelisted_domains":["https://example.com/"],"account_linking_url":"https://example.com/link"}. Only the listed properties are overwritten.',
    },
  ],
  output: [{ key: "result", type: "string", label: "Result (success)" }],

  execute(input, ctx) {
    const properties = jsonParam<Record<string, unknown>>("properties", input.properties);
    if (
      !properties || typeof properties !== "object" || Array.isArray(properties) ||
      Object.keys(properties).length === 0
    ) {
      throw new Error("properties must be a non-empty JSON object");
    }
    return new MessengerClient(ctx).request<{ result: string }>("/me/messenger_profile", {
      method: "POST",
      body: properties,
    });
  },
};

export default setMessengerProfile;
