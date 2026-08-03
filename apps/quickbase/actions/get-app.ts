import type { ActionDefinition } from "@w6w/types";
import { QuickbaseClient, resolveAppId } from "../lib/client.ts";

interface Input {
  appId?: string;
}

interface Output {
  id?: string;
  name?: string;
  description?: string;
  created?: string;
  updated?: string;
  timeZone?: string;
  dateFormat?: string;
  hasEveryoneOnTheInternet?: boolean;
  variables?: Array<{ name?: string; value?: string }>;
  memoryInfo?: { estMemory?: number; estMemoryInclDependentApps?: number };
  securityProperties?: Record<string, boolean>;
  dataClassification?: string;
  ancestorId?: string;
}

/**
 * `GET /apps/{appId}` — the application's own properties, including its
 * **application variables**.
 *
 * Those variables are the reason this is more than a name lookup: Quickbase
 * app builders use them the way an environment file is used, so a workflow can
 * read configuration out of the app it is automating instead of duplicating it.
 *
 * This is also the probe behind the auth `test` hook and the `quota` health
 * check — it is the cheapest call a user token is guaranteed to be entitled to,
 * since a token is assigned to applications in the first place.
 *
 * `hasEveryoneOnTheInternet` is worth reading before a workflow writes anything
 * sensitive: it reports whether the app is exposed publicly.
 */
const getApp: ActionDefinition<Input, Output> = {
  key: "get-app",
  type: "read",
  resource: "app",
  title: "Get Application",
  description:
    "Get an application's properties, including its application variables and security settings.",
  params: [
    {
      key: "appId",
      label: "Application ID",
      type: "string",
      placeholder: "bqrxxxxxx",
      hint: "Defaults to the application recorded on the connection.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Application ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "variables", type: "array", label: "Application variables" },
    { key: "securityProperties", type: "object", label: "Security properties" },
  ],

  execute(input, ctx) {
    const appId = resolveAppId(input.appId, ctx.connection);
    return new QuickbaseClient(ctx).request<Output>(`apps/${encodeURIComponent(appId)}`);
  },
};

export default getApp;
