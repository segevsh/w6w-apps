import type { ActionDefinition } from "@w6w/types";
import { HomeAssistantClient } from "../lib/client.ts";

/**
 * `POST /api/template` — render a Jinja2 template against the live state.
 *
 * ## The most powerful endpoint in the API, and the least obvious
 *
 * It gives a workflow the same expression language automations use, evaluated
 * server-side against every entity at once. Questions that would otherwise mean
 * fetching thousands of states and filtering locally become one small request:
 *
 *     {{ states.light | selectattr('state','eq','on') | list | count }}
 *     {{ state_attr('climate.hall','current_temperature') }}
 *     {{ expand('group.everyone') | selectattr('state','eq','home') | map(attribute='name') | join(', ') }}
 *
 * ## It returns plain text, not JSON
 *
 * Whatever the template produces is the body, as a string. `{{ 1 + 1 }}` gives
 * `2` — the two characters, not the number. A template producing a list gives
 * Python's repr of it (`['a', 'b']`, single quotes), which is **not valid
 * JSON** and will not parse. To get JSON out, the template has to say so:
 * `{{ my_list | to_json }}`.
 *
 * This action returns the raw text, and parses it as JSON only when it asks to.
 *
 * ## Errors come back as 400 with the Jinja message
 *
 * A typo'd entity id does not error — `states('light.ktichen')` returns
 * `unknown`, quietly. Only a syntax error fails.
 */
const action: ActionDefinition = {
  key: "template-render",
  type: "read",
  resource: "template",
  title: "Render a template",
  description:
    "Evaluate a Jinja2 template against live state — the whole instance queried server-side in " +
    "one call. Returns PLAIN TEXT, so a list comes back as Python repr rather than JSON.",
  params: [
    {
      key: "template",
      label: "Template",
      type: "text",
      required: true,
      default: "",
      placeholder: "{{ states.light | selectattr('state','eq','on') | list | count }}",
      hint: "Jinja2, with Home Assistant's own filters — `states()`, `state_attr()`, `expand()`, " +
        "`is_state()`.",
    },
    {
      key: "parseJson",
      label: "Parse As JSON",
      type: "boolean",
      default: false,
      hint: "Only works if the template ends with `| to_json`. Home Assistant renders lists as " +
        "Python repr with single quotes, which is not JSON.",
    },
  ],
  output: [
    { key: "result", type: "string", label: "The rendered text, verbatim" },
    { key: "parsed", type: "object", label: "The same parsed as JSON, when asked for" },
    { key: "numeric", type: "number", label: "The same as a number, when it is one" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const template = String(p.template ?? "").trim();
    if (!template) throw new Error("`template` is required");

    const result = await new HomeAssistantClient(ctx).request<string>("/template", {
      method: "POST",
      body: { template },
      // The endpoint answers with the rendered text, not a JSON document.
      text: true,
    });

    const text = String(result ?? "");
    let parsed: unknown;
    if (p.parseJson === true) {
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error(
          "the rendered template is not valid JSON. Home Assistant renders lists and dicts as " +
            "Python repr with single quotes — end the template with `| to_json` to get JSON out. " +
            `Got: ${text.slice(0, 120)}`,
        );
      }
    }

    return {
      result: text,
      parsed,
      numeric: text !== "" && Number.isFinite(Number(text)) ? Number(text) : undefined,
    };
  },
};

export default action;
