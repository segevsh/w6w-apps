import type { ActionDefinition } from "@w6w/types";
import { jsonParam, MessengerClient } from "../lib/client.ts";

interface Input {
  menus: unknown;
}

interface Menu {
  locale?: string;
  composer_input_disabled?: boolean;
  call_to_actions?: unknown[];
}

/**
 * Set the Page-level persistent menu — `POST /me/messenger_profile` with `persistent_menu`.
 * Each entry is `{ locale, composer_input_disabled?, call_to_actions[] }` (max 20 menu
 * items, `web_url` or `postback`), and at least one entry must have `"locale": "default"`.
 * The menu only appears once a Get Started button is set (use `set-messenger-profile`);
 * Page-level updates can take up to 24 hours to show.
 */
const setPersistentMenu: ActionDefinition<Input, { result: string }> = {
  key: "set-persistent-menu",
  type: "perform",
  resource: "profile",
  title: "Set Persistent Menu",
  description: "Set the menu that is always visible in a Messenger conversation with the Page.",
  idempotent: true,
  params: [
    {
      key: "menus",
      label: "Menus (JSON array)",
      type: "json",
      required: true,
      hint:
        '[{"locale":"default","composer_input_disabled":false,"call_to_actions":[{"type":"postback","title":"Talk to an agent","payload":"CARE_HELP"},{"type":"web_url","title":"Shop now","url":"https://example.com/"}]}]. Titles max 30 characters, payloads max 1000.',
    },
  ],
  output: [{ key: "result", type: "string", label: "Result (success)" }],

  execute(input, ctx) {
    const menus = jsonParam<Menu[]>("menus", input.menus);
    if (!Array.isArray(menus) || menus.length === 0) {
      throw new Error("menus must be a non-empty array");
    }
    if (!menus.some((m) => m?.locale === "default")) {
      throw new Error('at least one menu must have "locale": "default"');
    }
    for (const m of menus) {
      if ((m.call_to_actions?.length ?? 0) > 20) {
        throw new Error("a menu may hold at most 20 call_to_actions");
      }
    }
    return new MessengerClient(ctx).request<{ result: string }>("/me/messenger_profile", {
      method: "POST",
      body: { persistent_menu: menus },
    });
  },
};

export default setPersistentMenu;
