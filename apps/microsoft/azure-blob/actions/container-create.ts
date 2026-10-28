import type { ActionDefinition } from "@w6w/types";
import { BlobClient, containerName, json, query } from "../lib/client.ts";
import { CONTAINER_PARAM } from "../lib/params.ts";

/**
 * `PUT /{container}?restype=container` — create a container.
 *
 * ## Public access is off by default here, and it is a real decision
 *
 * `x-ms-blob-public-access` has three states, and the two that are not "off"
 * do genuinely different things:
 *
 * - **`blob`** — anybody with a blob's URL reads it, without any credential.
 *   The container itself cannot be listed, so the URL is the only secret, and
 *   URLs end up in logs, referrers and browser history.
 * - **`container`** — anybody can list the container and read everything in
 *   it. Nothing has to be guessed.
 *
 * This action defaults to neither, and asks for an acknowledgement before
 * either, because the difference between "a private bucket" and "the internet
 * can enumerate this" is one dropdown.
 *
 * Many storage accounts now have public access disabled at the account level,
 * in which case Azure refuses this regardless — a 409 rather than a silent
 * downgrade, which is the right way round.
 *
 * ## The name cannot be changed and the deleted name lingers
 *
 * There is no rename. And a deleted container's name is unusable until the
 * deletion finishes, which takes **at least 30 seconds** and can take much
 * longer — so create-delete-create with the same name fails in the middle.
 */
const action: ActionDefinition = {
  key: "container-create",
  type: "perform",
  resource: "container",
  title: "Create a container",
  description:
    "Create a container, PRIVATE by default. `blob` access makes any known URL readable without " +
    "a credential; `container` access lets anyone list and read everything — both are gated here.",
  idempotent: false,
  params: [
    CONTAINER_PARAM,
    {
      key: "publicAccess",
      label: "Anonymous Access",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Private — a credential is required" },
        { value: "blob", label: "Blob — anyone with a URL can read that blob" },
        { value: "container", label: "Container — anyone can list and read everything" },
      ],
    },
    {
      key: "confirmPublic",
      label: "I am allowing access without any credential",
      type: "boolean",
      default: false,
      showIf: { "!=": [{ var: "publicAccess" }, ""] },
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      default: "",
      advanced: true,
      hint: "Name/value pairs. Names must be valid C# identifiers — Azure rejects a hyphen.",
    },
  ],
  output: [
    { key: "created", type: "boolean", label: "Whether it was created" },
    { key: "container", type: "string", label: "Its name" },
    { key: "publicAccess", type: "string", label: "The anonymous access level, if any" },
    { key: "etag", type: "string", label: "Its ETag" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const container = containerName(p.container);
    const publicAccess = String(p.publicAccess ?? "").trim();

    if (publicAccess && p.confirmPublic !== true) {
      throw new Error(
        `set \`confirmPublic\` — \`${publicAccess}\` access means anonymous readers, with no ` +
          "credential of any kind" +
          (publicAccess === "container"
            ? ", and `container` additionally lets anyone LIST the contents, so nothing has to " +
              "be guessed"
            : ", and a blob's URL is then the only thing protecting it"),
      );
    }

    const headers: Record<string, string> = {};
    if (publicAccess) headers["x-ms-blob-public-access"] = publicAccess;

    const metadata = json(p.metadata, "metadata") as Record<string, unknown> | undefined;
    for (const [name, value] of Object.entries(metadata ?? {})) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        throw new Error(
          `metadata name "${name}" is not a valid C# identifier — Azure requires letters, digits ` +
            "and underscores, starting with a letter or underscore, and rejects hyphens",
        );
      }
      headers[`x-ms-meta-${name}`] = String(value);
    }

    const result = await new BlobClient(ctx).full(`/${encodeURIComponent(container)}`, {
      method: "PUT",
      query: query({ restype: "container" }),
      headers,
    });

    ctx.log(
      publicAccess ? "warn" : "info",
      publicAccess
        ? `created a PUBLIC Azure container — ${publicAccess} access needs no credential`
        : "created an Azure container",
      { container, publicAccess: publicAccess || "private" },
    );

    return {
      created: true,
      container,
      publicAccess: publicAccess || undefined,
      etag: result.headers["etag"],
    };
  },
};

export default action;
