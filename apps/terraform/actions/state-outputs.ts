import type { ActionDefinition } from "@w6w/types";
import { flatten, flattenAll, TerraformClient } from "../lib/client.ts";
import { WORKSPACE_PARAMS } from "../lib/params.ts";
import { resolveWorkspace } from "../lib/workspaces.ts";

/**
 * `GET /api/v2/workspaces/{id}/current-state-version?include=outputs` — what
 * this workspace publishes.
 *
 * ## This is the plug-and-play seam
 *
 * Outputs are how one piece of infrastructure tells everything else what it
 * ended up as: the database endpoint, the queue URL, the load balancer's
 * hostname, the generated bucket name. A workflow that reads them configures
 * itself against what was actually built, rather than against a value somebody
 * copied into a config file six months ago and that has since moved.
 *
 * This is the reason to have this action at all, and the reason it reads the
 * *current* state version rather than a named one — the current one is what is
 * true now.
 *
 * ## Sensitive outputs come back with no value, and the rest may still be
 * secrets
 *
 * An output marked `sensitive` in the configuration returns `"value": null`
 * with `"sensitive": true`. That part is handled by the API.
 *
 * The part that is not: **Terraform does not know what is secret**. A
 * connection string, an API key returned by a provider, a generated password
 * that nobody remembered to mark — these come back in full, from an endpoint
 * whose response looks like configuration. So this action reports counts and
 * names in the log and never the values, and flags how many outputs were
 * withheld so a workflow reading `undefined` knows why.
 *
 * ## The state version can be older than the last apply
 *
 * `current-state-version` is the newest state **that has been uploaded**. A run
 * that is still applying has not produced one yet, so outputs read during an
 * apply are the previous ones — correct, and not current. `serial` and
 * `created-at` say which.
 */
const action: ActionDefinition = {
  key: "state-outputs",
  type: "read",
  resource: "state",
  title: "Read state outputs",
  description:
    "A workspace's current output values — the endpoints and names other systems need. " +
    "Sensitive outputs return NULL; the rest may still be secrets, because Terraform does not " +
    "know which are.",
  params: [
    ...WORKSPACE_PARAMS,
    {
      key: "names",
      label: "Only These Outputs",
      type: "string",
      default: "",
      hint: "Comma-separated. Blank returns all of them.",
    },
  ],
  output: [
    { key: "outputs", type: "object", label: "Name → value, for the readable ones" },
    { key: "details", type: "array", label: "Each output with its type and sensitivity" },
    { key: "names", type: "array", label: "Every output's name" },
    { key: "sensitiveNames", type: "array", label: "The ones whose value was withheld" },
    { key: "count", type: "number", label: "How many outputs exist" },
    { key: "sensitiveCount", type: "number", label: "How many returned no value" },
    { key: "serial", type: "number", label: "The state serial — it increments per apply" },
    { key: "createdAt", type: "string", label: "When this state version was uploaded" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const ref = await resolveWorkspace(p, ctx);

    const document = await new TerraformClient(ctx).request(
      `/api/v2/workspaces/${encodeURIComponent(ref.id)}/current-state-version`,
      { query: { include: "outputs" } },
    );
    const stateVersion = flatten(document.data as never) ?? {};
    // The outputs are sideloaded siblings, not children of the state version.
    const included = flattenAll(document.included);

    const wanted = String(p.names ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const selected = wanted.length
      ? included.filter((entry) => wanted.includes(String(entry["name"] ?? "")))
      : included;

    const outputs: Record<string, unknown> = {};
    const details: Array<Record<string, unknown>> = [];
    const sensitiveNames: string[] = [];

    for (const entry of selected) {
      const name = String(entry["name"] ?? "");
      if (!name) continue;
      const sensitive = entry["sensitive"] === true;
      if (sensitive) {
        // The API already withheld the value; this records that it exists.
        sensitiveNames.push(name);
      } else {
        outputs[name] = entry["value"];
      }
      details.push({
        name,
        type: entry["type"],
        sensitive,
        ...(sensitive ? {} : { value: entry["value"] }),
      });
    }

    // Names and counts. The values are the caller's, and several of them are
    // credentials that nothing marked as such.
    ctx.log("info", "read Terraform state outputs", {
      workspaceId: ref.id,
      count: details.length,
      sensitiveCount: sensitiveNames.length,
    });

    return {
      outputs,
      details,
      names: details.map((entry) => entry.name),
      sensitiveNames,
      count: details.length,
      sensitiveCount: sensitiveNames.length,
      serial: stateVersion["serial"],
      createdAt: stateVersion["created-at"],
    };
  },
};

export default action;
