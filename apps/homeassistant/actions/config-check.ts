import type { ActionDefinition } from "@w6w/types";
import { HomeAssistantClient } from "../lib/client.ts";

/**
 * `POST /api/config/core/check_config` — validate `configuration.yaml` without
 * restarting.
 *
 * ## The one that saves a broken restart
 *
 * A syntax error in `configuration.yaml` does not stop Home Assistant while it
 * is running; it stops it from **coming back up**. Restarting to find out is
 * how an instance ends up down until somebody with SSH access fixes it — and if
 * that instance is the only route into the house's automations, that is a
 * genuinely bad afternoon.
 *
 * So the sequence worth building is: check, and only then restart. This action
 * is the check half; the restart is `service-call` with
 * `homeassistant.restart`, which is deliberately not wrapped in a convenience
 * action here.
 *
 * ## It needs an add-on on some installs
 *
 * On Home Assistant Container and Core this endpoint is available directly. On
 * Supervised and OS installs the check runs through the Supervisor. Where it is
 * unavailable it answers 405, which the client explains.
 */
const action: ActionDefinition = {
  key: "config-check",
  type: "read",
  resource: "config",
  title: "Check the configuration",
  description:
    "Validate configuration.yaml without restarting. A syntax error does not stop a running " +
    "instance — it stops it coming back, so check before restarting.",
  params: [],
  output: [
    { key: "valid", type: "boolean", label: "Safe to restart" },
    { key: "errors", type: "string", label: "What is wrong, when something is" },
    { key: "result", type: "string", label: "Home Assistant's own verdict string" },
  ],

  async execute(_input, ctx) {
    const result = await new HomeAssistantClient(ctx).request<
      { result?: string; errors?: string | null }
    >("/config/core/check_config", { method: "POST" });

    const valid = result?.result === "valid";
    if (!valid) {
      ctx.log("warn", "the Home Assistant configuration is not valid — do not restart", {
        result: result?.result,
      });
    }
    return { valid, errors: result?.errors ?? undefined, result: result?.result };
  },
};

export default action;
