import type { ActionDefinition } from "@w6w/types";
import { CloudClient, compact, json } from "../lib/client.ts";

/**
 * `POST /v1/organizations/{org}/services` — provision a service.
 *
 * ## The password comes back once, in this response, and never again
 *
 * Creating a service returns a generated password for the `default` user in the
 * creation response. It is not retrievable afterwards — the only other option
 * is resetting it. So the output of this action is the single copy, and
 * whatever the workflow does with it next is the whole security story. This is
 * why it is returned but **never logged**.
 *
 * ## The IP access list defaults to nothing, deliberately
 *
 * A service with an empty list accepts no connections at all. That is the safe
 * default and it is also why a freshly created service appears broken: the
 * password works and the connection never gets far enough to use it.
 *
 * This action requires the list to be given explicitly rather than defaulting
 * either way, because both defaults are wrong — empty is confusing and
 * `0.0.0.0/0` is a database reachable from the internet.
 *
 * ## Idle scaling is on by default here
 *
 * With it on, the service suspends after `idleTimeoutMinutes` and wakes on the
 * next query. That makes the first query after a quiet period slow and makes
 * the bill a function of use rather than of time. For anything that is not
 * serving live traffic it is the right default, and it is not always the API's.
 */
const action: ActionDefinition = {
  key: "service-create",
  type: "perform",
  resource: "service",
  title: "Create a service",
  description:
    "Provision a ClickHouse Cloud service. The generated password is returned ONCE in this " +
    "response and is never retrievable again. The IP access list must be given — an empty one " +
    "accepts no connections, and `0.0.0.0/0` is a database open to the internet.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "provider",
      label: "Cloud Provider",
      type: "select",
      required: true,
      default: "aws",
      options: [
        { value: "aws", label: "AWS" },
        { value: "gcp", label: "Google Cloud" },
        { value: "azure", label: "Azure" },
      ],
    },
    {
      key: "region",
      label: "Region",
      type: "string",
      required: true,
      default: "",
      placeholder: "eu-west-1",
      hint: "Permanent — a service cannot be moved between regions.",
    },
    {
      key: "ipAccessList",
      label: "IP Access List",
      type: "json",
      required: true,
      default: "",
      hint: 'e.g. [{"source":"203.0.113.4","description":"workflow host"}]. An EMPTY list ' +
        "accepts nothing, which is why a new service looks broken; `0.0.0.0/0` opens it to any " +
        "address.",
    },
    {
      key: "confirmOpenToInternet",
      label: "I am allowing connections from any address",
      type: "boolean",
      default: false,
    },
    {
      key: "idleScaling",
      label: "Idle Scaling",
      type: "boolean",
      default: true,
      hint: "On, the service suspends when unused and wakes on the next query — the bill follows " +
        "use rather than time. The first query after a pause is slow.",
    },
    {
      key: "idleTimeoutMinutes",
      label: "Idle Timeout (minutes)",
      type: "number",
      default: 15,
      showIf: { "==": [{ var: "idleScaling" }, true] },
    },
    {
      key: "minReplicaMemoryGb",
      label: "Minimum Memory per Replica (GB)",
      type: "number",
      default: 8,
      advanced: true,
    },
    {
      key: "maxReplicaMemoryGb",
      label: "Maximum Memory per Replica (GB)",
      type: "number",
      default: 356,
      advanced: true,
    },
  ],
  output: [
    { key: "service", type: "object", label: "The service as created" },
    { key: "id", type: "string", label: "Its id" },
    { key: "state", type: "string", label: "provisioning — it is not queryable yet" },
    { key: "password", type: "string", label: "The default user's password — the ONLY copy" },
    { key: "host", type: "string", label: "The HTTPS endpoint host" },
    { key: "openToInternet", type: "boolean", label: "Whether any address may connect" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");
    const region = String(p.region ?? "").trim();
    if (!region) throw new Error("`region` is required, and a service cannot be moved later");

    const accessList = json(p.ipAccessList, "ipAccessList");
    if (!Array.isArray(accessList)) {
      throw new Error(
        '`ipAccessList` must be an array of {"source","description"} entries. It is required ' +
          "because both defaults are wrong: an empty list accepts no connections at all, and " +
          "`0.0.0.0/0` puts the database on the internet",
      );
    }
    const openToInternet = accessList.some((entry) =>
      (entry as { source?: string })?.source === "0.0.0.0/0"
    );
    if (openToInternet && p.confirmOpenToInternet !== true) {
      throw new Error(
        "set `confirmOpenToInternet` — `0.0.0.0/0` means this database accepts connections from " +
          "every address on the internet. It is still password-protected, and that is a " +
          "materially different exposure from one reachable only from named addresses",
      );
    }

    const idleScaling = p.idleScaling !== false;
    const body = compact({
      name,
      provider: String(p.provider ?? "aws"),
      region,
      ipAccessList: accessList,
      idleTimeoutMinutes: idleScaling ? Number(p.idleTimeoutMinutes ?? 15) : undefined,
      minReplicaMemoryGb: Number(p.minReplicaMemoryGb ?? 8),
      maxReplicaMemoryGb: Number(p.maxReplicaMemoryGb ?? 356),
    });
    // Meaningful when false, so it is set rather than compacted away.
    body.idleScaling = idleScaling;

    const result = await new CloudClient(ctx).request<{
      service?: {
        id?: string;
        state?: string;
        endpoints?: Array<{ protocol?: string; host?: string }>;
      };
      password?: string;
    }>("/services", { method: "POST", body });

    const service = result?.service;
    const https = (service?.endpoints ?? []).find((endpoint) => endpoint?.protocol === "https");

    // The id and the shape. NEVER the password — it is the only copy, and a
    // run log is exactly where it should not end up.
    ctx.log(
      openToInternet ? "warn" : "info",
      openToInternet
        ? "created a ClickHouse service reachable from any address"
        : "created a ClickHouse service",
      { id: service?.id, idleScaling, openToInternet },
    );

    return {
      service,
      id: service?.id,
      state: service?.state,
      // Returned once by the API and never again.
      password: result?.password,
      host: https?.host,
      openToInternet,
    };
  },
};

export default action;
