import type { ActionDefinition } from "@w6w/types";
import { CloudClient, uuid } from "../lib/client.ts";

/**
 * `PATCH /v1/organizations/{org}/services/{id}/state` — start or stop a
 * service.
 *
 * ## Stopping is not the same as idling, and the difference matters
 *
 * An **idle** service suspended itself and wakes on the next query. A
 * **stopped** service was stopped deliberately and does **not** wake — a query
 * against it fails, and keeps failing, until something starts it.
 *
 * So stopping a service that workflows query is not a cost optimisation, it is
 * an outage with a manual recovery. Idle scaling is the cost optimisation, and
 * `service-scale` is where it lives.
 *
 * ## The change is asynchronous and the next one will be refused
 *
 * The call returns with the service in `starting` or `stopping`, and any
 * further change during that window is a **409** rather than a queue. A
 * workflow that stops and then immediately changes something has to wait.
 *
 * ## An already-stopped service is a 409, not a no-op
 *
 * This action reads the state first so a scheduled stop running against
 * something already stopped does not look like a failure.
 */
const action: ActionDefinition = {
  key: "service-state",
  type: "perform",
  resource: "service",
  title: "Start or stop a service",
  description:
    "Start or stop a service. A STOPPED service does not wake on a query — unlike an idle one — " +
    "so stopping something a workflow queries is an outage, not a saving. Idle scaling is the " +
    "saving.",
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
      key: "command",
      label: "Command",
      type: "select",
      required: true,
      default: "start",
      options: [
        { value: "start", label: "Start" },
        { value: "stop", label: "Stop — it will not wake on a query" },
      ],
    },
    {
      key: "confirmStop",
      label: "I understand queries will fail until it is started again",
      type: "boolean",
      default: false,
      showIf: { "==": [{ var: "command" }, "stop"] },
    },
  ],
  output: [
    { key: "id", type: "string", label: "The service" },
    { key: "state", type: "string", label: "starting or stopping — it is in flight" },
    { key: "changed", type: "boolean", label: "False when it was already in that state" },
    { key: "previousState", type: "string", label: "What it was before" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = uuid(p.serviceId, "serviceId");
    const command = String(p.command ?? "start");

    if (command === "stop" && p.confirmStop !== true) {
      throw new Error(
        "set `confirmStop` — a stopped service does not wake on a query the way an idle one " +
          "does, so every query against it fails until something starts it again. If the aim is " +
          "to stop paying while it is unused, `service-scale` turns on idle scaling instead",
      );
    }

    const client = new CloudClient(ctx);
    const before = await client.request<{ state?: string }>(`/services/${id}`);
    const previousState = String(before?.state ?? "");

    // A scheduled stop hitting an already-stopped service is a no-op, not a
    // failure — and Azure-style, the API would answer 409 rather than shrug.
    const settled = command === "start" ? "running" : "stopped";
    if (previousState === settled) {
      ctx.log("info", `ClickHouse service is already ${settled}`, { id });
      return { id, state: previousState, changed: false, previousState };
    }

    const after = await client.request<{ state?: string }>(`/services/${id}/state`, {
      method: "PATCH",
      body: { command },
    });

    ctx.log(
      command === "stop" ? "warn" : "info",
      command === "stop"
        ? "stopped a ClickHouse service — queries will fail until it is started again"
        : "started a ClickHouse service",
      { id, previousState },
    );

    return { id, state: after?.state, changed: true, previousState };
  },
};

export default action;
