import type { ActionDefinition } from "@w6w/types";
import { BlobClient, query } from "../lib/client.ts";
import { child, children, text, toRecord } from "../lib/xml.ts";
import { PAGE_PARAMS } from "../lib/params.ts";

/**
 * `GET /?comp=list` — the containers in this account.
 *
 * ## `PublicAccess` is the field to read first
 *
 * A container is private unless somebody made it otherwise, and there are two
 * levels of otherwise:
 *
 * - **`blob`** — anybody who knows a blob's URL can read that blob. The
 *   container cannot be listed, so the URL is the secret, and URLs leak.
 * - **`container`** — anybody can *list* the container and then read
 *   everything in it. No URL needs to be guessed.
 *
 * Neither shows up as an error anywhere. This action counts both, because in a
 * list of thirty containers a `PublicAccess` value does not stand out.
 *
 * ## An empty result may mean the account is empty, or that it is not
 *
 * With a Shared Key credential it means empty: the key sees everything. With a
 * SAS token scoped to one container it means the token cannot list at the
 * account level, which is a different thing that produces the same silence.
 */
const action: ActionDefinition = {
  key: "container-list",
  type: "search",
  resource: "container",
  title: "List containers",
  description:
    "The account's containers, counting those with PUBLIC access — `blob` makes any known URL " +
    "readable, `container` makes the whole thing listable, and neither is an error anywhere.",
  params: [
    {
      key: "prefix",
      label: "Name Prefix",
      type: "string",
      default: "",
    },
    {
      key: "includeMetadata",
      label: "Include Metadata",
      type: "boolean",
      default: false,
    },
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "containers", type: "array", label: "The containers" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "names", type: "array", label: "Just the names" },
    { key: "publicCount", type: "number", label: "How many allow anonymous access" },
    { key: "publiclyListable", type: "array", label: "Those whose whole contents can be listed" },
    { key: "nextMarker", type: "string", label: "Absent on the last page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    const root = await new BlobClient(ctx).request("/", {
      query: query({
        comp: "list",
        prefix: p.prefix,
        include: p.includeMetadata === true ? "metadata" : undefined,
        maxresults: Math.min(5000, Math.max(1, Number(p.maxResults ?? 100))),
        marker: p.marker,
      }),
    });

    const results = child(root, "EnumerationResults");
    const containers: Array<Record<string, unknown>> = children(
      child(results, "Containers"),
      "Container",
    ).map((entry) => ({
      name: text(entry, "Name"),
      ...toRecord(child(entry, "Properties")),
      metadata: toRecord(child(entry, "Metadata")),
    }));

    // Absent is private; the two present values differ in how bad they are.
    const publicContainers = containers.filter((entry) =>
      entry["PublicAccess"] === "blob" || entry["PublicAccess"] === "container"
    );
    const publiclyListable = containers
      .filter((entry) => entry["PublicAccess"] === "container")
      .map((entry) => String(entry.name ?? ""))
      .filter(Boolean);

    if (publicContainers.length) {
      ctx.log("warn", "this storage account has containers open to anonymous access", {
        publicCount: publicContainers.length,
        listableCount: publiclyListable.length,
      });
    }

    const marker = text(results, "NextMarker");
    return {
      containers,
      count: containers.length,
      names: containers.map((entry) => entry.name).filter(Boolean),
      publicCount: publicContainers.length,
      publiclyListable,
      nextMarker: marker || undefined,
    };
  },
};

export default action;
