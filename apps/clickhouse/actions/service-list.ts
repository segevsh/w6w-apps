import type { ActionDefinition } from "@w6w/types";
import { CloudClient } from "../lib/client.ts";

/**
 * `GET /v1/organizations/{org}/services` — the services in this organisation.
 *
 * ## `state` is what decides whether a query will work
 *
 * `running` is the only state that answers SQL. The others are worth
 * distinguishing:
 *
 * - **`idle`** — the service auto-suspended after its idle timeout. It wakes on
 *   the next query, which takes seconds, and the first query pays for that.
 *   This is normal and is what idle scaling is for.
 * - **`stopped`** — somebody stopped it deliberately. It does **not** wake on a
 *   query; something has to start it.
 * - **`provisioning`**, **`starting`**, **`stopping`** — in flight, and a
 *   change during one is a 409 rather than a queue.
 * - **`degraded`** — running, and not well.
 *
 * `idle` and `stopped` look alike from a failed query and are not alike at all,
 * so this counts them separately.
 *
 * ## Cost lives in the scaling fields, not in a price
 *
 * The API reports no money here. `minReplicaMemoryGb`, `maxReplicas` and
 * `idleTimeoutMinutes` are what the bill is a function of, and a service with
 * idle scaling **off** is one paying for compute around the clock — which is
 * the single most common avoidable cost on this platform, and invisible unless
 * somebody looks.
 */
const action: ActionDefinition = {
  key: "service-list",
  type: "search",
  resource: "service",
  title: "List services",
  description:
    "The organisation's services. `running` is the only state that answers SQL — and `idle` " +
    "wakes on the next query while `stopped` does NOT, which is the distinction a failed query " +
    "cannot make.",
  params: [
    {
      key: "name",
      label: "Name Contains",
      type: "string",
      default: "",
      hint: "Matched here — the API has no name filter.",
    },
  ],
  output: [
    { key: "services", type: "array", label: "The services" },
    { key: "count", type: "number", label: "Matching" },
    { key: "ids", type: "array", label: "Just the service ids" },
    { key: "id", type: "string", label: "The id, when exactly one matched" },
    { key: "runningCount", type: "number", label: "How many can answer SQL right now" },
    { key: "idleCount", type: "number", label: "How many are asleep and will wake on a query" },
    { key: "stoppedCount", type: "number", label: "How many are stopped and will NOT wake" },
    {
      key: "alwaysOnCount",
      type: "number",
      label: "How many have idle scaling off, and so bill continuously",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const services = await new CloudClient(ctx).request<
      Array<{ id?: string; name?: string; state?: string; idleScaling?: boolean }>
    >("/services");

    const all = Array.isArray(services) ? services : [];
    const needle = String(p.name ?? "").trim().toLowerCase();
    const matching = needle
      ? all.filter((service) => String(service?.name ?? "").toLowerCase().includes(needle))
      : all;

    const count = (state: string) => matching.filter((service) => service?.state === state).length;
    // Idle scaling off means paying for compute around the clock.
    const alwaysOnCount = matching.filter((service) => service?.idleScaling === false).length;

    ctx.log("info", "listed ClickHouse services", {
      count: matching.length,
      runningCount: count("running"),
      alwaysOnCount,
    });

    return {
      services: matching,
      count: matching.length,
      ids: matching.map((service) => service?.id).filter(Boolean),
      id: matching.length === 1 ? matching[0]?.id : undefined,
      runningCount: count("running"),
      idleCount: count("idle"),
      stoppedCount: count("stopped"),
      alwaysOnCount,
    };
  },
};

export default action;
