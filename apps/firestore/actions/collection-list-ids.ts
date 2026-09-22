import type { ActionDefinition } from "@w6w/types";
import {
  documentsRoot,
  FirestoreClient,
  pathSegments,
  resolveDatabase,
  resolveProject,
} from "../lib/client.ts";
import { DATABASE_PARAM, PAGING_PARAMS, PARENT_PATH_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `POST /v1/{+parent}:listCollectionIds` — verified against the discovery doc
 * (`documents.listCollectionIds`, request `ListCollectionIdsRequest
 * {pageSize, pageToken, readTime}`, response
 * `ListCollectionIdsResponse {collectionIds: string[], nextPageToken?}`).
 *
 * One action covers both cases the API documents, because they differ only in
 * the `parent` it carries:
 *
 *   - **Subcollections of a document** — give a `parentPath`
 *     (`users/alice`), and the ids under it come back.
 *   - **Top-level collections of the database** — leave `parentPath` blank and
 *     `parent` is `…/documents`, which the discovery doc names explicitly as the
 *     way to "list top-level collections".
 *
 * A collection id is all this returns: Firestore has no "list collections"
 * resource, only the ids, because a collection exists only while it holds
 * documents.
 */
const action: ActionDefinition = {
  key: "collection-list-ids",
  type: "search",
  resource: "collection",
  title: "List collection ids",
  description: "List the collection ids under a document, or the database's top-level collections.",
  params: [PROJECT_PARAM, DATABASE_PARAM, PARENT_PATH_PARAM, ...PAGING_PARAMS],
  output: [
    { key: "collectionIds", type: "array", label: "Collection ids" },
    { key: "count", type: "number", label: "Ids in this page" },
    { key: "nextPageToken", type: "string", label: "Pass back for the next page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const database = resolveDatabase(ctx.connection, p.databaseId);
    const parentPath = pathSegments(String(p.parentPath ?? "")).join("/");
    const parent = parentPath
      ? `${documentsRoot(project, database)}/${parentPath}`
      : documentsRoot(project, database);

    ctx.log("info", "listing Firestore collection ids", { parent });

    const res = await new FirestoreClient(ctx).request<{
      collectionIds?: string[];
      nextPageToken?: string;
    }>(`/${parent}:listCollectionIds`, {
      method: "POST",
      body: {
        pageSize: p.pageSize as number | undefined,
        pageToken: (p.pageToken as string | undefined) || undefined,
      },
    });

    const collectionIds = res?.collectionIds ?? [];
    return { collectionIds, count: collectionIds.length, nextPageToken: res?.nextPageToken };
  },
};

export default action;
