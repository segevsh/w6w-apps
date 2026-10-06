import type { ActionDefinition } from "@w6w/types";
import { jsonParam, MessengerClient, requireString } from "../lib/client.ts";

interface Input {
  text: string;
  locale?: string;
  localizedGreetings?: unknown;
}

interface Greeting {
  locale: string;
  text: string;
}

/**
 * Set the welcome-screen greeting — `POST /me/messenger_profile` with
 * `greeting: [{ locale, text }]`. A `default` locale entry is always sent first; further
 * locales are optional.
 */
const setGreeting: ActionDefinition<Input, { result: string }> = {
  key: "set-greeting",
  type: "perform",
  resource: "profile",
  title: "Set Greeting",
  description: "Set the greeting text on the Page's Messenger welcome screen.",
  idempotent: true,
  params: [
    { key: "text", label: "Default greeting", type: "text", required: true },
    {
      key: "localizedGreetings",
      label: "Other locales (JSON array)",
      type: "json",
      hint: 'e.g. [{"locale":"en_US","text":"Timeless apparel for the masses."}]',
    },
  ],
  output: [{ key: "result", type: "string", label: "Result (success)" }],

  execute(input, ctx) {
    const greeting: Greeting[] = [{ locale: "default", text: requireString("text", input.text) }];
    if (input.localizedGreetings !== undefined && input.localizedGreetings !== "") {
      const extra = jsonParam<Greeting[]>("localizedGreetings", input.localizedGreetings);
      if (!Array.isArray(extra)) throw new Error("localizedGreetings must be a JSON array");
      greeting.push(...extra);
    }
    return new MessengerClient(ctx).request<{ result: string }>("/me/messenger_profile", {
      method: "POST",
      body: { greeting },
    });
  },
};

export default setGreeting;
