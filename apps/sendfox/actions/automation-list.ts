import type { ActionDefinition } from "@w6w/types";
import { SendfoxClient } from "../lib/client.ts";

/**
 * `GET /automations` — the account's automations.
 *
 * SendFox documents no query parameters here. Each `Automation` embeds its
 * `automation_triggers` (the list or campaign that starts it) and its
 * `automation_items` (the steps), so the list call is enough to see what an
 * automation does without a second read.
 *
 * Creating and narrowing automations exist as documented endpoints but are not
 * in this app's covered surface — see the README.
 */
type Input = Record<string, never>;

const automationList: ActionDefinition<Input> = {
  key: "automation-list",
  type: "search",
  resource: "automation",
  title: "List Automations",
  description: "List the account's automations, including their triggers and steps.",
  output: [
    { key: "data", type: "array", label: "Automations" },
    { key: "current_page", type: "number", label: "Page number" },
    { key: "total", type: "number", label: "Total automations" },
    { key: "per_page", type: "number", label: "Automations per page" },
  ],

  execute(_input, ctx) {
    return new SendfoxClient(ctx).json("/automations");
  },
};

export default automationList;
