import type { ActionDefinition } from "@w6w/types";
import {
  collectionParent,
  decodeDocument,
  FirestoreClient,
  resolveDatabase,
  resolveProject,
} from "../lib/client.ts";
import {
  COLLECTION_PATH_PARAM,
  DATABASE_PARAM,
  fieldPaths,
  MASK_PARAM,
  PAGING_PARAMS,
  PROJECT_PARAM,
  READ_TIME_PARAM,
} from "../lib/params.ts";

/**
 * `GET /v1/{+parent}/{collectionId}` — verified against the discovery doc
 * (`documents.listDocuments`, response `ListDocumentsResponse
 * {documents: Document[], nextPageToken?}`).
 *
 * **One page per call, by design.** This action returns the `nextPageToken` and
 * stops; following it is the caller's job (the same convention as this pack's
 * other paginated actions). Silently looping here would turn a one-document
 * request into an unbounded scan, since Firestore's own default page is
 * large and its ceiling is undocumented per request.
 *
 * `orderBy` is Firestore's **string** form (`priority desc, __name__ desc`),
 * which is what this RPC documents — not the `Order[]` array that `runQuery`
 * takes.
 *
 * Two documented combinations are rejected here before the request, because the
 * API would reject them anyway and its complaint is less specific:
 * `showMissing` (return parent paths that do not exist but have sub-documents)
 * cannot be combined with `orderBy`, and `recursive` cannot be combined with
 * `showMissing`.
 */
const action: ActionDefinition = {
  key: "document-list",
  type: "search",
  resource: "document",
  title: "List documents",
  description: "List one page of documents in a collection, with an optional ordering.",
  params: [
    PROJECT_PARAM,
    DATABASE_PARAM,
    COLLECTION_PATH_PARAM,
    ...PAGING_PARAMS,
    {
      key: "orderBy",
      label: "Order By",
      type: "string",
      default: "",
      placeholder: "priority desc, __name__ desc",
      hint: "Firestore's string form (this RPC, unlike `runQuery`, does not take an array). " +
        "Cannot be combined with Show Missing.",
    },
    {
      key: "showMissing",
      label: "Show Missing",
      type: "boolean",
      default: false,
      hint: "Also return parent paths that do not exist but have sub-documents under them. " +
        "Cannot be combined with Order By or Recursive.",
    },
    {
      key: "recursive",
      label: "Recursive",
      type: "boolean",
      default: false,
      hint: "Include every document nested under the parent at any depth. Cannot be combined " +
        "with Show Missing.",
    },
    MASK_PARAM,
    READ_TIME_PARAM,
  ],
  output: [
    { key: "documents", type: "array", label: "Documents (with `data` decoded)" },
    { key: "count", type: "number", label: "Documents in this page" },
    { key: "nextPageToken", type: "string", label: "Pass back for the next page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const database = resolveDatabase(ctx.connection, p.databaseId);
    const { parent, collectionId } = collectionParent(
      project,
      database,
      String(p.collectionPath ?? ""),
    );

    ctx.log("info", "listing Firestore documents", { parent, collectionId });

    const res = await new FirestoreClient(ctx).request<{
      documents?: Array<Record<string, unknown>>;
      nextPageToken?: string;
    }>(`/${parent}/${collectionId}`, {
      query: {
        pageSize: p.pageSize as number | undefined,
        pageToken: (p.pageToken as string | undefined) || undefined,
        orderBy: (p.orderBy as string | undefined) || undefined,
        showMissing: p.showMissing === true ? true : undefined,
        recursive: p.recursive === true ? true : undefined,
        "mask.fieldPaths": fieldPaths(p.mask),
        readTime: (p.readTime as string | undefined) || undefined,
      },
    });

    const documents = (res?.documents ?? []).map((doc) => decodeDocument(doc as never));
    return { documents, count: documents.length, nextPageToken: res?.nextPageToken };
  },
};

export default action;
