import type { ActionDefinition } from "@w6w/types";
import { CloudClient, json, uuid } from "../lib/client.ts";

/**
 * `PATCH /v1/organizations/{org}/services/{id}` with `ipAccessList` — who may
 * connect at all.
 *
 * ## This is the perimeter, and it fails before authentication
 *
 * An address not on the list does not get a wrong-password error. It does not
 * get a connection. From a workflow that is a timeout, which looks like the
 * service being down and not like a permission problem — so a workflow that
 * "stopped working" after a network change is usually this.
 *
 * ## The list replaces, it does not merge
 *
 * Sending one entry leaves the service with one entry, and everything else that
 * could connect can no longer connect. This action reads the existing list
 * first and reports exactly which sources it is about to remove, because the
 * call succeeds either way and the damage is somebody else's connection.
 *
 * ## `0.0.0.0/0` is one entry away from a database on the internet
 *
 * Password-protected, and reachable from every address. There are real reasons
 * to do it — a workflow host with no static address is the usual one — and no
 * reason to do it by accident.
 */
const action: ActionDefinition = {
  key: "ip-access-list-set",
  type: "perform",
  resource: "service",
  title: "Set a service's IP access list",
  description:
    "Replace the addresses that may connect. It REPLACES rather than merges, and an address off " +
    "the list fails to connect rather than to authenticate — which from a workflow looks like an " +
    "outage.",
  idempotent: true,
  params: [
    {
      key: "serviceId",
      label: "Service ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "ipAccessList",
      label: "IP Access List",
      type: "json",
      required: true,
      default: "",
      hint: 'The FULL list, e.g. [{"source":"203.0.113.4","description":"workflow"}]. Anything ' +
        "not in it can no longer connect.",
    },
    {
      key: "confirmOpenToInternet",
      label: "I am allowing connections from any address",
      type: "boolean",
      default: false,
    },
    {
      key: "confirmRemovals",
      label: "I have checked what this removes",
      type: "boolean",
      default: false,
      hint: "Required when the new list drops a source the old one had.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "The service" },
    { key: "ipAccessList", type: "array", label: "The list as it now stands" },
    { key: "added", type: "array", label: "Sources that were not there before" },
    { key: "removed", type: "array", label: "Sources that can no longer connect" },
    { key: "openToInternet", type: "boolean", label: "Whether any address may now connect" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = uuid(p.serviceId, "serviceId");

    const wanted = json(p.ipAccessList, "ipAccessList");
    if (!Array.isArray(wanted)) {
      throw new Error('`ipAccessList` must be an array of {"source","description"} entries');
    }
    const sources = wanted.map((entry) => String((entry as { source?: string })?.source ?? ""))
      .filter(Boolean);

    const openToInternet = sources.includes("0.0.0.0/0");
    if (openToInternet && p.confirmOpenToInternet !== true) {
      throw new Error(
        "set `confirmOpenToInternet` — `0.0.0.0/0` lets every address on the internet reach this " +
          "database. It remains password-protected, and that is still a materially different " +
          "exposure from being reachable only from named addresses",
      );
    }

    const client = new CloudClient(ctx);
    // The list replaces rather than merges, so what is about to stop working
    // is worth naming before it stops working.
    const before = await client.request<{ ipAccessList?: Array<{ source?: string }> }>(
      `/services/${id}`,
    );
    const existing = (before?.ipAccessList ?? [])
      .map((entry) => String(entry?.source ?? ""))
      .filter(Boolean);

    const removed = existing.filter((source) => !sources.includes(source));
    const added = sources.filter((source) => !existing.includes(source));

    if (removed.length && p.confirmRemovals !== true) {
      throw new Error(
        `this list drops ${removed.length} source(s) that can currently connect — ${
          removed.join(", ")
        }. Set \`confirmRemovals\` to proceed. The list replaces rather than merges, and anything ` +
          "dropped stops being able to connect at all, which presents as a timeout rather than " +
          "as a permission error",
      );
    }

    const service = await client.request<{ ipAccessList?: unknown[] }>(`/services/${id}`, {
      method: "PATCH",
      body: { ipAccessList: wanted },
    });

    ctx.log(
      openToInternet || removed.length ? "warn" : "info",
      openToInternet
        ? "this ClickHouse service now accepts connections from any address"
        : removed.length
        ? "removed sources from a ClickHouse service's access list — they can no longer connect"
        : "updated a ClickHouse service's access list",
      { id, addedCount: added.length, removedCount: removed.length },
    );

    return {
      id,
      ipAccessList: service?.ipAccessList ?? wanted,
      added,
      removed,
      openToInternet,
    };
  },
};

export default action;
