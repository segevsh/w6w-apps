import type { ActionDefinition } from "@w6w/types";
import { BlobClient, containerName, csv, query, readBlobList } from "../lib/client.ts";
import { CONTAINER_PARAM, PAGE_PARAMS } from "../lib/params.ts";

/**
 * `GET /{container}?restype=container&comp=list` — what is in a container.
 *
 * ## The synthetic folders arrive in their own element
 *
 * Same model as Cloud Storage — blob names contain slashes and nothing is a
 * folder — but the response shape differs in a way worth stating: with a
 * `delimiter`, Azure returns `<Blob>` elements for the direct children and
 * **`<BlobPrefix>`** elements for the level below, as siblings inside
 * `<Blobs>`. A reader walking `Blob` elements sees an empty folder and no
 * error, exactly as it would reading only `items` from a GCS listing.
 *
 * ## `include` is how you see what is otherwise invisible
 *
 * Four things are hidden by default and each is a different kind of surprise:
 *
 * - **`snapshots`** — read-only point-in-time copies. They cost storage and do
 *   not appear in a plain listing.
 * - **`versions`** — with versioning on, every overwrite keeps the old blob.
 *   Also billed, also invisible.
 * - **`deleted`** — soft-deleted blobs inside their retention window, which is
 *   what `blob-undelete` restores.
 * - **`uncommittedblobs`** — blocks staged by an interrupted upload that was
 *   never committed. These are billed and belong to no blob at all, so nothing
 *   in an ordinary listing accounts for them. It is the usual explanation for a
 *   container whose size does not match its contents.
 */
const action: ActionDefinition = {
  key: "blob-list",
  type: "search",
  resource: "blob",
  title: "List blobs",
  description:
    "List a container's blobs. With a delimiter, subfolders come back as separate <BlobPrefix> " +
    "elements. Snapshots, versions, soft-deleted and UNCOMMITTED blobs are all billed and all " +
    "hidden unless asked for.",
  params: [
    CONTAINER_PARAM,
    {
      key: "prefix",
      label: "Prefix",
      type: "string",
      default: "",
      placeholder: "logs/2026/",
    },
    {
      key: "delimiter",
      label: "Delimiter",
      type: "string",
      default: "",
      placeholder: "/",
      hint: "Set to `/` for a folder-shaped view: direct children as blobs, the level below as " +
        "prefixes. Blank lists everything recursively.",
    },
    {
      key: "include",
      label: "Also Include",
      type: "string",
      default: "",
      placeholder: "snapshots, versions, deleted, uncommittedblobs, metadata",
      hint: "Comma-separated. `uncommittedblobs` is the one that explains a container billing " +
        "for more than it appears to hold.",
    },
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "blobs", type: "array", label: "The blobs" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "names", type: "array", label: "Just the blob names" },
    { key: "prefixes", type: "array", label: "Synthetic subfolders — only with a delimiter" },
    { key: "prefixCount", type: "number", label: "How many subfolders were found" },
    { key: "totalBytes", type: "number", label: "Size of the blobs in this page" },
    { key: "nextMarker", type: "string", label: "Absent on the last page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const container = containerName(p.container);

    const root = await new BlobClient(ctx).request(`/${encodeURIComponent(container)}`, {
      query: query({
        restype: "container",
        comp: "list",
        prefix: p.prefix,
        delimiter: p.delimiter,
        include: csv(p.include)?.join(","),
        maxresults: Math.min(5000, Math.max(1, Number(p.maxResults ?? 100))),
        marker: p.marker,
      }),
    });

    const { blobs, prefixes, nextMarker } = readBlobList(root);
    // XML has no numbers; Content-Length arrives as text.
    const totalBytes = blobs.reduce(
      (sum, blob) => sum + Number(blob["Content-Length"] ?? 0),
      0,
    );

    ctx.log("info", "listed Azure blobs", { count: blobs.length, prefixCount: prefixes.length });

    return {
      blobs,
      count: blobs.length,
      names: blobs.map((blob) => blob.name).filter(Boolean),
      prefixes,
      prefixCount: prefixes.length,
      totalBytes,
      nextMarker,
    };
  },
};

export default action;
