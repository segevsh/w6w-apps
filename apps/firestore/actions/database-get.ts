import type { ActionDefinition } from "@w6w/types";
import { databaseName, FirestoreClient, resolveDatabase, resolveProject } from "../lib/client.ts";
import { DATABASE_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /v1/{+name}` where `name` is `projects/{project}/databases/{database}` —
 * verified against the discovery doc (`databases.get`, response
 * `GoogleFirestoreAdminV1Database`).
 *
 * The database resource answers with what a workflow needs to make decisions
 * about the database itself: `type` (`FIRESTORE_NATIVE` or `DATASTORE_MODE`),
 * `concurrencyMode`, `databaseEdition`, `locationId` and
 * `pointInTimeRecoveryEnablement`. It is also the endpoint the OAuth probe uses,
 * since it proves the project and database id without needing a document to
 * exist.
 */
const action: ActionDefinition = {
  key: "database-get",
  type: "read",
  resource: "database",
  title: "Get the database",
  description: "Read the Firestore database's metadata: edition, concurrency mode and location.",
  params: [PROJECT_PARAM, DATABASE_PARAM],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "type", type: "string", label: "Firestore Native or Datastore mode" },
    { key: "databaseEdition", type: "string", label: "Edition" },
    { key: "concurrencyMode", type: "string", label: "Concurrency mode" },
    { key: "locationId", type: "string", label: "Location" },
    { key: "pointInTimeRecoveryEnablement", type: "string", label: "Point-in-time recovery" },
    { key: "createTime", type: "string", label: "Created" },
    { key: "updateTime", type: "string", label: "Updated" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const database = resolveDatabase(ctx.connection, p.databaseId);

    ctx.log("info", "reading Firestore database metadata", { project, database });

    return await new FirestoreClient(ctx).request(`/${databaseName(project, database)}`);
  },
};

export default action;
