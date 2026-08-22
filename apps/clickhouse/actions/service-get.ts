import type { ActionDefinition } from "@w6w/types";
import { CloudClient, uuid } from "../lib/client.ts";

/**
 * `GET /v1/organizations/{org}/services/{id}` — one service.
 *
 * ## The endpoint and the IP access list are the two things a query needs
 *
 * `endpoints` carries the host and port for the HTTPS interface — which is what
 * a `service` connection is configured with, and it is **8443**, not 443.
 *
 * `ipAccessList` is the allowlist of source addresses. A service created
 * through the console starts with nothing on it, and a connection from an
 * address that is not listed **fails to connect** rather than failing to
 * authenticate. From a workflow that looks exactly like the service being down,
 * so this reports the list and whether it is open to everything.
 *
 * ## `0.0.0.0/0` on this list means the database is reachable from anywhere
 *
 * Still password-protected, but reachable — which is a materially different
 * exposure from a database only reachable from named addresses, and it is one
 * checkbox in the console. This flags it.
 *
 * ## The scaling fields are the bill
 *
 * `minReplicaMemoryGb` × `numReplicas` is the floor a running service costs,
 * and `idleScaling` with `idleTimeoutMinutes` decides whether that floor
 * applies around the clock or only while it is in use.
 */
const action: ActionDefinition = {
  key: "service-get",
  type: "read",
  resource: "service",
  title: "Get a service",
  description:
    "One service's state, endpoints, scaling and IP access list. An address not on that list " +
    "fails to CONNECT rather than to authenticate, which from a workflow looks like the service " +
    "being down.",
  params: [
    {
      key: "serviceId",
      label: "Service ID",
      type: "string",
      required: true,
      default: "",
      hint: "A UUID — `service-list` reports them.",
    },
  ],
  output: [
    { key: "service", type: "object", label: "The service" },
    { key: "name", type: "string", label: "Its name" },
    { key: "state", type: "string", label: "running, idle, stopped, provisioning, degraded" },
    { key: "queryable", type: "boolean", label: "Whether SQL would work right now" },
    { key: "host", type: "string", label: "The HTTPS endpoint host" },
    { key: "port", type: "number", label: "8443, not 443" },
    { key: "clickhouseVersion", type: "string", label: "The server version" },
    { key: "ipAccessList", type: "array", label: "Which addresses may connect at all" },
    { key: "openToInternet", type: "boolean", label: "Whether 0.0.0.0/0 is on that list" },
    { key: "idleScaling", type: "boolean", label: "False means it bills around the clock" },
    { key: "numReplicas", type: "number", label: "Replicas now" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = uuid(p.serviceId, "serviceId");

    const service = await new CloudClient(ctx).request<{
      name?: string;
      state?: string;
      clickhouseVersion?: string;
      idleScaling?: boolean;
      numReplicas?: number;
      ipAccessList?: Array<{ source?: string; description?: string }>;
      endpoints?: Array<{ protocol?: string; host?: string; port?: number }>;
    }>(`/services/${id}`);

    const https = (service?.endpoints ?? []).find((endpoint) => endpoint?.protocol === "https");
    const ipAccessList = service?.ipAccessList ?? [];
    const openToInternet = ipAccessList.some((entry) => entry?.source === "0.0.0.0/0");

    if (openToInternet) {
      ctx.log(
        "warn",
        "this ClickHouse service accepts connections from any address — still password-protected, " +
          "but reachable from anywhere",
        { serviceId: id },
      );
    }

    return {
      service,
      name: service?.name,
      state: service?.state,
      // The only state that answers SQL without waking first.
      queryable: service?.state === "running",
      host: https?.host,
      port: https?.port,
      clickhouseVersion: service?.clickhouseVersion,
      ipAccessList,
      openToInternet,
      idleScaling: service?.idleScaling,
      numReplicas: service?.numReplicas,
    };
  },
};

export default action;
