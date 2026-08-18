import type { ActionDefinition } from "@w6w/types";
import { compact, csv, entityId, HomeAssistantClient, json } from "../lib/client.ts";

/**
 * `POST /api/services/<domain>/<service>` — the endpoint that actually does
 * things.
 *
 * Everything Home Assistant can *do* is a service: `light.turn_on`,
 * `climate.set_temperature`, `notify.mobile_app_phone`, `script.turn_on`. This
 * is the counterpart to `state-set`, which only changes what Home Assistant
 * believes.
 *
 * ## A 200 does not mean the device did anything
 *
 * The response is the list of **states that changed during the call**, and it
 * is frequently empty. Turning on a light that is already on changes nothing.
 * A device that is offline changes nothing. A service that is inherently
 * asynchronous — a vacuum being sent home, a script being started — returns
 * before anything has happened.
 *
 * So an empty `changed` list is normal and is *not* an error, but it is also
 * not confirmation. This action returns the count explicitly so a workflow can
 * decide, and the honest way to confirm an outcome is to read the state back
 * afterwards.
 *
 * ## `return_response` is for the services that answer
 *
 * A few services return data — a weather forecast, a calendar query, a
 * conversation reply. Those **require** `?return_response`, and calling them
 * without it fails; calling an ordinary service *with* it also fails. There is
 * no way to tell which kind a service is from its name, so this is a parameter
 * with a plain explanation rather than something guessed at.
 */
const action: ActionDefinition = {
  key: "service-call",
  type: "perform",
  resource: "service",
  title: "Call a service",
  description:
    "Do something — this is the endpoint that controls devices, unlike `state-set`. A 200 with " +
    "no changed states is normal and is not confirmation that anything happened.",
  idempotent: false,
  params: [
    {
      key: "domain",
      label: "Domain",
      type: "string",
      required: true,
      default: "",
      placeholder: "light",
      hint: "The service's domain — `light`, `climate`, `notify`, `script`, `homeassistant`.",
    },
    {
      key: "service",
      label: "Service",
      type: "string",
      required: true,
      default: "",
      placeholder: "turn_on",
      hint: "Without the domain. `service-list` shows what an instance actually has.",
    },
    {
      key: "entityId",
      label: "Target Entities",
      type: "string",
      default: "",
      hint: "Comma-separated entity ids. Most services need a target; some — `notify`, `script` " +
        "— do not.",
    },
    {
      key: "data",
      label: "Service Data",
      type: "json",
      default: "",
      hint: 'Everything else the service takes, e.g. {"brightness_pct": 60, "color_name": "warm ' +
        'white"}. Merged with the target.',
    },
    {
      key: "returnResponse",
      label: "Expect A Response",
      type: "boolean",
      default: false,
      hint: "Required for the few services that return data (forecasts, calendar queries) and " +
        "an error for the ones that do not. There is no way to tell from the name.",
    },
  ],
  output: [
    { key: "changed", type: "array", label: "States that changed during the call" },
    { key: "changedCount", type: "number", label: "How many — zero is normal, not a failure" },
    { key: "response", type: "object", label: "Service response data, when asked for" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const domain = String(p.domain ?? "").trim().toLowerCase();
    const service = String(p.service ?? "").trim().toLowerCase();
    if (!domain) throw new Error("`domain` is required");
    if (!service) throw new Error("`service` is required");
    if (service.includes(".")) {
      throw new Error(
        `\`service\` should not include the domain — give \`domain\` as "${
          service.split(".")[0]
        }" ` +
          `and \`service\` as "${service.split(".")[1]}"`,
      );
    }

    const targets = csv(p.entityId)?.map((e, i) => entityId(e, `entityId[${i}]`));
    const data = json(p.data, "data") as Record<string, unknown> | undefined;
    const returnResponse = p.returnResponse === true;

    const result = await new HomeAssistantClient(ctx).request<unknown>(
      `/services/${encodeURIComponent(domain)}/${encodeURIComponent(service)}`,
      {
        method: "POST",
        query: returnResponse ? { return_response: true } : {},
        body: compact({ ...(data ?? {}), entity_id: targets }),
      },
    );

    // Without return_response the body is the changed-state array; with it, an
    // object carrying both.
    const changed = Array.isArray(result)
      ? result
      : ((result as { changed_states?: unknown[] })?.changed_states ?? []);
    const response = Array.isArray(result)
      ? undefined
      : (result as { service_response?: unknown })?.service_response;

    ctx.log("info", "called a Home Assistant service", {
      domain,
      service,
      targets: targets?.length ?? 0,
      changedCount: changed.length,
    });

    return { changed, changedCount: changed.length, response };
  },
};

export default action;
