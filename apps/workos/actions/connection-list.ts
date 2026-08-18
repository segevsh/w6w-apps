import type { ActionDefinition } from "@w6w/types";
import { compact, WorkOSClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /connections` — the SSO connections, and whether they are live.
 *
 * A Connection is one customer's link to their identity provider — Okta,
 * Entra, Google Workspace, or a generic SAML or OIDC setup. Its `state` is the
 * thing to read:
 *
 *   - **`active`** — their staff can sign in.
 *   - **`draft`** or **`inactive`** — the Admin Portal was opened and the setup
 *     was never finished. This is the common one, and it is invisible until
 *     somebody tries to log in and cannot.
 *
 * So an onboarding dashboard is exactly this list filtered to non-active
 * connections: the customers who started SSO setup and stalled.
 */
const action: ActionDefinition = {
  key: "connection-list",
  type: "read",
  resource: "connection",
  title: "List SSO connections",
  description:
    "Each customer's link to their identity provider, and its state. A `draft` connection is a " +
    "setup that was started and abandoned — invisible until somebody cannot log in.",
  params: [
    {
      key: "organizationId",
      label: "Organization ID",
      type: "string",
      default: "",
      hint: "Narrow to one customer.",
    },
    {
      key: "connectionType",
      label: "Connection Type",
      type: "string",
      default: "",
      placeholder: "OktaSAML",
      advanced: true,
      hint: "e.g. OktaSAML, AzureSAML, GoogleOAuth, GenericSAML, GenericOIDC.",
    },
    {
      key: "pendingOnly",
      label: "Only Unfinished Setups",
      type: "boolean",
      default: false,
      hint: "Filters the result to connections that are not `active` — the customers who started " +
        "SSO setup and stopped.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "connections", type: "array", label: "Connections" },
    { key: "count", type: "number", label: "Connections returned" },
    { key: "after", type: "string", label: "Cursor, when more remain" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const want = returnAll ? Infinity : Math.max(1, Number(p.limit ?? 50));

    const { items, after } = await new WorkOSClient(ctx).requestAll<{ state?: string }>(
      "/connections",
      {
        query: compact({
          organization_id: p.organizationId,
          connection_type: p.connectionType,
        }) as Record<string, string>,
      },
      want,
    );

    const connections = p.pendingOnly === true ? items.filter((c) => c.state !== "active") : items;
    return { connections, count: connections.length, after };
  },
};

export default action;
