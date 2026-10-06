import type { ActionDefinition } from "@w6w/types";
import { entraError, GraphClient, odataList, seg } from "../lib/client.ts";
import { selectParam } from "../lib/params.ts";

interface Input {
  applicationId: string;
  idType?: string;
  select?: string[];
}

/**
 * `GET /applications/{id}` or `GET /applications(appId='{appId}')`
 *
 * https://learn.microsoft.com/en-us/graph/api/application-get?view=graph-rest-1.0
 *
 * The reference allows either address: the **object id** (`id`) or the **application (client) id**
 * (`appId`). They are different GUIDs and are easy to confuse — the Entra admin center labels them
 * "Object ID" and "Application (client) ID". `keyCredentials` (public key values) come back only
 * when named in `$select`, throttled at 150 requests per minute per tenant. Needs
 * `Application.Read.All`.
 */
const getApplication: ActionDefinition<Input, Record<string, unknown>> = {
  key: "get-application",
  type: "read",
  resource: "application",
  title: "Get Application",
  description: "Get one app registration by object id or application (client) id.",
  params: [
    {
      key: "applicationId",
      label: "Application",
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
    { key: "signInAudience", type: "string", label: "Sign-in audience" },
  ],

  async execute(input, ctx) {
    const id = (input.applicationId ?? "").trim();
    if (!id) throw new Error(entraError("Application is required."));
    const client = new GraphClient(ctx);
    const path = input.idType === "appId"
      ? `/applications(appId='${id.replaceAll("'", "''")}')`
      : `/applications/${seg(id)}`;
    return await client.request(path, { query: { $select: odataList(input.select) } });
  },
};

export default getApplication;
