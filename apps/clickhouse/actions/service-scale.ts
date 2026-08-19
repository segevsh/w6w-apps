import type { ActionDefinition } from "@w6w/types";
import { CloudClient, emptyToUndefined, uuid } from "../lib/client.ts";

/**
 * `PATCH /v1/organizations/{org}/services/{id}/replicaScaling` — change what
 * a service costs.
 *
 * ## This is where the bill is decided, and idle scaling is most of it
 *
 * A ClickHouse Cloud service bills on compute while it is running. With **idle
 * scaling on** it suspends after its timeout and stops billing compute until
 * the next query wakes it; with it off, the minimum replica size × replica
 * count is charged around the clock whether anything queries it or not.
 *
 * For a service serving live traffic, always-on is correct. For everything else
 * — development, a nightly job, an analytics service somebody queries twice a
 * week — it is the single most common avoidable cost on the platform, and
 * nothing surfaces it because a service that is idle and a service that is busy
 * look identical in a list.
 *
 * ## Turning idle scaling OFF is the expensive direction, so it is gated
 *
 * Turning it on can make a query slow. Turning it off makes every hour billable
 * forever. Only the second is asked about.
 *
 * ## Scaling changes are asynchronous, and the next one is a 409
 *
 * The service enters a scaling state and refuses further changes until it
 * settles.
 */
const action: ActionDefinition = {
  key: "service-scale",
  type: "perform",
  resource: "service",
  title: "Scale a service",
  description:
    "Change replica sizing and idle scaling — where the bill is decided. Turning idle scaling " +
    "OFF makes the minimum size billable around the clock, which is the most common avoidable " +
    "cost here, so only that direction is gated.",
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
      key: "idleScaling",
      label: "Idle Scaling",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "true", label: "On — suspend when unused, wake on a query" },
        { value: "false", label: "Off — always running, and always billing" },
      ],
    },
    {
      key: "confirmAlwaysOn",
      label: "I accept this service will bill around the clock",
      type: "boolean",
      default: false,
      showIf: { "==": [{ var: "idleScaling" }, "false"] },
    },
    {
      key: "idleTimeoutMinutes",
      label: "Idle Timeout (minutes)",
      type: "number",
      default: 0,
      hint: "Zero leaves it unchanged. Shorter saves more and makes the first query after a " +
        "pause slower, more often.",
    },
    {
      key: "minReplicaMemoryGb",
      label: "Minimum Memory per Replica (GB)",
      type: "number",
      default: 0,
      hint: "Zero leaves it unchanged. This is the floor the service bills at while running.",
    },
    {
      key: "maxReplicaMemoryGb",
      label: "Maximum Memory per Replica (GB)",
      type: "number",
      default: 0,
      hint: "Zero leaves it unchanged — the ceiling autoscaling may reach.",
    },
    {
      key: "numReplicas",
      label: "Replicas",
      type: "number",
      default: 0,
      advanced: true,
      hint: "Zero leaves it unchanged. Replicas multiply both throughput and cost.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "The service" },
    { key: "changed", type: "array", label: "The fields this call submitted" },
    { key: "alwaysOn", type: "boolean", label: "Whether it now bills around the clock" },
    { key: "service", type: "object", label: "The service as it now stands" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = uuid(p.serviceId, "serviceId");

    const idleScaling = String(p.idleScaling ?? "").trim();
    if (idleScaling === "false" && p.confirmAlwaysOn !== true) {
      throw new Error(
        "set `confirmAlwaysOn` — with idle scaling off, this service's minimum replica size is " +
          "billed every hour whether or not anything queries it. That is correct for something " +
          "serving live traffic and is the most common avoidable cost on everything else",
      );
    }

    const positive = (value: unknown) => {
      const n = Number(value ?? 0);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };

    const body = emptyToUndefined({
      idleScaling: idleScaling === "" ? undefined : idleScaling === "true",
      idleTimeoutMinutes: positive(p.idleTimeoutMinutes),
      minReplicaMemoryGb: positive(p.minReplicaMemoryGb),
      maxReplicaMemoryGb: positive(p.maxReplicaMemoryGb),
      numReplicas: positive(p.numReplicas),
    });
    if (!body) throw new Error("nothing to change — give at least one setting");
    // `false` is meaningful and `emptyToUndefined` would have kept it, but say
    // so explicitly: a dropped `idleScaling: false` is the expensive direction.
    if (idleScaling !== "") body.idleScaling = idleScaling === "true";

    const service = await new CloudClient(ctx).request<Record<string, unknown>>(
      `/services/${id}/replicaScaling`,
      { method: "PATCH", body },
    );

    ctx.log(
      idleScaling === "false" ? "warn" : "info",
      idleScaling === "false"
        ? "turned idle scaling OFF — this ClickHouse service now bills around the clock"
        : "changed a ClickHouse service's scaling",
      { id, fields: Object.keys(body) },
    );

    return {
      id,
      changed: Object.keys(body),
      alwaysOn: service?.idleScaling === false,
      service,
    };
  },
};

export default action;
