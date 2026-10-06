import type { ActionDefinition } from "@w6w/types";
import { entraError, GraphClient, odataList, seg } from "../lib/client.ts";
import { selectParam } from "../lib/params.ts";

interface Input {
  servicePrincipalId: string;
  idType?: string;
  select?: string[];
}

/**
 * `GET /servicePrincipals/{id}` or `GET /servicePrincipals(appId='{appId}')`
 *
 * https://learn.microsoft.com/en-us/graph/api/serviceprincipal-get?view=graph-rest-1.0
 *
 * Addressable by the service principal's **object id** or by its `appId` (the application client
 * id shared with the app registration, and the one thing that is the same across tenants). A
 * service principal's `id` is not the registration's `id`. `keyCredentials` come back only when
 * named in `$select`, throttled at 150 requests per minute per tenant. Needs
 * `Application.Read.All`.
 */
const getServicePrincipal: ActionDefinition<Input, Record<string, unknown>> = {
  key: "get-service-principal",
  type: "read",
  resource: "service-principal",
  title: "Get Service Principal",
  description: "Get one service principal by object id or application (client) id.",
  params: [
    {
      key: "servicePrincipalId",
      label: "Service principal",
      type: "string",
      required: true,
      hint: "The object id, or the application (client) id when 'Id type' says so.",
    },
    {
      key: "idType",
      label: "Id type",
      type: "select",
      default: "id",
      options: [
        { value: "id", label: "Object id" },
        { value: "appId", label: "Application (client) id" },
      ],
    },
    selectParam(),
  ],
  output: [
    { key: "id", type: "string", label: "Object id" },
    { key: "appId", type: "string", label: "Application (client) id" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "servicePrincipalType", type: "string", label: "Service principal type" },
  ],

  async execute(input, ctx) {
    const id = (input.servicePrincipalId ?? "").trim();
    if (!id) throw new Error(entraError("Service principal is required."));
    const client = new GraphClient(ctx);
    const path = input.idType === "appId"
      ? `/servicePrincipals(appId='${id.replaceAll("'", "''")}')`
      : `/servicePrincipals/${seg(id)}`;
    return await client.request(path, { query: { $select: odataList(input.select) } });
  },
};

export default getServicePrincipal;
