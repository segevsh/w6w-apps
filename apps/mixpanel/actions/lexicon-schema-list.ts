import type { ActionDefinition } from "@w6w/types";
import { MixpanelClient } from "../lib/client.ts";

/**
 * `GET /api/app/projects/{project_id}/schemas` — the Lexicon schema.
 *
 * Lexicon is where a company writes down what its events *mean*: descriptions,
 * property types, which events are hidden, which are deprecated. Reading it is
 * how a workflow — or a model being handed this project — learns that
 * `Signed Up` is the current event and `signup_complete` is the 2023 one nobody
 * removed.
 *
 * This is the only action on the `/api/app` surface rather than `/api/query`.
 * It is the same host and the same service-account credential, and it does not
 * consume one of the sixty queries an hour.
 */
const action: ActionDefinition = {
  key: "lexicon-schema-list",
  type: "read",
  resource: "event",
  title: "List Lexicon schemas",
  description:
    "The project's documented event and property definitions — descriptions, types, and which " +
    "events are hidden or deprecated. Not a query, so it costs nothing from the hourly budget.",
  params: [
    {
      key: "entityType",
      label: "Entity Type",
      type: "select",
      default: "",
      options: [
        { value: "", label: "All" },
        { value: "event", label: "Events" },
        { value: "profile", label: "Profile properties" },
        { value: "lookup", label: "Lookup tables" },
      ],
    },
  ],
  output: [
    { key: "results", type: "array", label: "Schema entries" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new MixpanelClient(ctx);
    const entityType = String(p.entityType ?? "").trim();

    return await client.request(
      `/api/app/projects/${encodeURIComponent(client.projectId)}/schemas${
        entityType ? `/${encodeURIComponent(entityType)}` : ""
      }`,
      // The project id is already in the path here.
      { noProjectId: true },
    );
  },
};

export default action;
