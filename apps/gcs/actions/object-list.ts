import type { ActionDefinition } from "@w6w/types";
import { bucketName, query, StorageClient } from "../lib/client.ts";
import { BUCKET_PARAM, PAGE_PARAMS } from "../lib/params.ts";

/**
 * `GET /b/{bucket}/o` — what is in a bucket.
 *
 * ## Folders are a rendering trick, and this is where it happens
 *
 * A bucket is a flat namespace. `prefix=logs/` narrows to names starting with
 * it; adding **`delimiter=/`** makes Cloud Storage split the result in two:
 *
 * - **`items`** — objects directly under the prefix.
 * - **`prefixes`** — the synthetic "subfolders" one level down.
 *
 * A caller reading only `items` from a delimited listing sees an apparently
 * empty folder while everything sits one level deeper. This action returns
 * both, and counts them separately, because that mistake produces no error at
 * all. Without a delimiter, the listing is fully recursive and `prefixes` is
 * empty.
 *
 * ## Versions and soft-deleted objects are invisible by default
 *
 * `versions=true` includes non-current generations in a versioned bucket;
 * `softDeleted=true` shows objects inside their soft-delete window. Both are
 * excluded normally, which is why a bucket that "has nothing in it" refuses to
 * be deleted.
 *
 * ## `matchGlob` is the filter people write by hand
 *
 * `**\/*.log` server-side, rather than listing everything and filtering in the
 * workflow — which for a large bucket is the difference between one request
 * and a thousand.
 */
const action: ActionDefinition = {
  key: "object-list",
  type: "search",
  resource: "object",
  title: "List objects",
  description:
    "List a bucket's objects. With a delimiter, subfolders come back in a SEPARATE `prefixes` " +
    "array — reading only `items` shows an empty folder while everything sits one level deeper.",
  params: [
    BUCKET_PARAM,
    {
      key: "prefix",
      label: "Prefix",
      type: "string",
      default: "",
      placeholder: "logs/2026/",
      hint: "Names starting with this. It is a string match, not a directory.",
    },
    {
      key: "delimiter",
      label: "Delimiter",
      type: "string",
      default: "",
      placeholder: "/",
      hint: "Set to `/` for a folder-shaped view: direct children in `items`, subfolders in " +
        "`prefixes`. Blank lists everything recursively.",
    },
    {
      key: "matchGlob",
      label: "Match Glob",
      type: "string",
      default: "",
      placeholder: "**/*.log",
      hint: "Filtered by Cloud Storage rather than by the workflow.",
    },
    {
      key: "versions",
      label: "Include Old Versions",
      type: "boolean",
      default: false,
      hint: "Non-current generations, which are hidden otherwise and still cost storage.",
    },
    {
      key: "softDeleted",
      label: "Only Soft-Deleted",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Objects inside their soft-delete window — restorable, invisible, and counting as " +
        "bucket contents.",
    },
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "objects", type: "array", label: "The objects" },
    { key: "count", type: "number", label: "Objects in this page" },
    { key: "names", type: "array", label: "Just the object names" },
    { key: "prefixes", type: "array", label: "Synthetic subfolders — only with a delimiter" },
    { key: "prefixCount", type: "number", label: "How many subfolders were found" },
    { key: "totalBytes", type: "number", label: "Size of the objects in this page" },
    { key: "nextPageToken", type: "string", label: "Absent on the last page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const bucket = bucketName(p.bucket);

    const body = await new StorageClient(ctx).request<{
      items?: Array<{ name?: string; size?: string }>;
      prefixes?: string[];
      nextPageToken?: string;
    }>(`/b/${encodeURIComponent(bucket)}/o`, {
      query: query({
        prefix: p.prefix,
        delimiter: p.delimiter,
        matchGlob: p.matchGlob,
        versions: p.versions === true ? true : undefined,
        softDeleted: p.softDeleted === true ? true : undefined,
        maxResults: Math.min(1000, Math.max(1, Number(p.maxResults ?? 100))),
        pageToken: p.pageToken,
      }),
    });

    const objects = body?.items ?? [];
    // Synthetic directories, which only exist when a delimiter was given.
    const prefixes = body?.prefixes ?? [];
    // `size` is a string of bytes, because it can exceed a safe integer.
    const totalBytes = objects.reduce((sum, item) => sum + Number(item?.size ?? 0), 0);

    ctx.log("info", "listed Cloud Storage objects", {
      count: objects.length,
      prefixCount: prefixes.length,
    });

    return {
      objects,
      count: objects.length,
      names: objects.map((item) => item?.name).filter(Boolean),
      prefixes,
      prefixCount: prefixes.length,
      totalBytes,
      nextPageToken: body?.nextPageToken,
    };
  },
};

export default action;
