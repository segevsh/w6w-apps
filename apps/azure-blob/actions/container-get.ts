import type { ActionDefinition } from "@w6w/types";
import { BlobClient, containerName, query } from "../lib/client.ts";
import { CONTAINER_PARAM } from "../lib/params.ts";

/**
 * `GET /{container}?restype=container` — a container's properties.
 *
 * Like `blob-get`, the whole answer is in the response headers and the body is
 * empty. The three worth reading:
 *
 * - **`x-ms-blob-public-access`** — absent means private. `blob` means any
 *   known URL is readable by anyone; `container` means anyone can list and read
 *   everything. This is the setting that turns a storage account into a public
 *   website by accident.
 * - **`x-ms-lease-state`** — a leased container cannot be deleted by anyone
 *   without the lease id.
 * - **`x-ms-has-immutability-policy`** and **`x-ms-has-legal-hold`** — when
 *   either is set, blobs inside cannot be deleted or modified *at all*, by
 *   anyone, including the account owner, until the policy expires or the hold
 *   is released. It is the one thing in Azure Storage that the account key
 *   cannot override, and a delete failing for this reason gives an error that
 *   does not obviously say so.
 */
const action: ActionDefinition = {
  key: "container-get",
  type: "read",
  resource: "container",
  title: "Get container properties",
  description:
    "A container's access level, lease state and immutability. An immutability policy or legal " +
    "hold makes its blobs undeletable by ANYONE, including the account key — the only thing in " +
    "Azure Storage that outranks it.",
  params: [CONTAINER_PARAM],
  output: [
    { key: "container", type: "string", label: "Its name" },
    { key: "publicAccess", type: "string", label: "Absent means private" },
    { key: "isPublic", type: "boolean", label: "Whether anonymous readers can reach it" },
    { key: "leaseState", type: "string", label: "available, leased, expired, breaking, broken" },
    { key: "immutable", type: "boolean", label: "Whether blobs inside cannot be deleted at all" },
    { key: "legalHold", type: "boolean", label: "Whether a legal hold is in force" },
    { key: "lastModified", type: "string", label: "When it last changed" },
    { key: "metadata", type: "object", label: "Custom metadata, lowercased by HTTP" },
    { key: "headers", type: "object", label: "Every response header" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const container = containerName(p.container);

    const result = await new BlobClient(ctx).full(`/${encodeURIComponent(container)}`, {
      method: "HEAD",
      query: query({ restype: "container" }),
    });

    const headers = result.headers;
    const publicAccess = headers["x-ms-blob-public-access"];
    const immutable = headers["x-ms-has-immutability-policy"] === "true";
    const legalHold = headers["x-ms-has-legal-hold"] === "true";

    const metadata: Record<string, string> = {};
    for (const [name, value] of Object.entries(headers)) {
      if (name.startsWith("x-ms-meta-")) metadata[name.slice("x-ms-meta-".length)] = value;
    }

    if (publicAccess) {
      ctx.log("warn", "this container allows anonymous access", { container, publicAccess });
    }
    if (immutable || legalHold) {
      ctx.log(
        "info",
        "blobs in this container cannot be deleted or modified while the policy or hold stands — " +
          "not even with the account key",
        { container, immutable, legalHold },
      );
    }

    return {
      container,
      publicAccess,
      isPublic: Boolean(publicAccess),
      leaseState: headers["x-ms-lease-state"],
      immutable,
      legalHold,
      lastModified: headers["last-modified"],
      metadata,
      headers,
    };
  },
};

export default action;
