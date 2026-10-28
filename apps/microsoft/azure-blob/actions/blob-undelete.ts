import type { ActionDefinition } from "@w6w/types";
import { BlobClient, blobName, containerName, query } from "../lib/client.ts";
import { BLOB_PARAM, CONTAINER_PARAM } from "../lib/params.ts";

/**
 * `PUT /{container}/{blob}?comp=undelete` — bring a soft-deleted blob back.
 *
 * ## No generation, no version, no timestamp — just the name
 *
 * Unlike Cloud Storage, which needs the generation of the version to restore,
 * Azure's undelete takes only the blob's name and restores **everything
 * soft-deleted under it** — the blob and all its soft-deleted snapshots, at
 * once. There is no way to bring back one snapshot and not another from this
 * call.
 *
 * That makes it much simpler to use and slightly blunter than it looks.
 *
 * ## It only works inside the retention window, and only if the policy is on
 *
 * With no soft-delete policy there is nothing to undelete and the call is a
 * 404 — indistinguishable, from here, from a blob that never existed. The
 * error says so rather than implying the blob is unrecoverable when the truth
 * is that the account never kept it.
 *
 * ## Undeleting something that was not deleted is not an error
 *
 * A live blob answers 200 and nothing changes. So this is safe to call
 * speculatively, which is worth knowing for a recovery workflow that does not
 * know which of a list actually went.
 */
const action: ActionDefinition = {
  key: "blob-undelete",
  type: "perform",
  resource: "blob",
  title: "Restore a deleted blob",
  description:
    "Bring back a soft-deleted blob and all its soft-deleted snapshots — by NAME, with no " +
    "version to name. Only works inside the retention window, and only if the account has a " +
    "soft-delete policy at all.",
  idempotent: true,
  params: [CONTAINER_PARAM, BLOB_PARAM],
  output: [
    { key: "restored", type: "boolean", label: "Whether the call succeeded" },
    { key: "name", type: "string", label: "What was restored" },
    { key: "etag", type: "string", label: "The blob's ETag afterwards" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const container = containerName(p.container);
    const blob = blobName(p.blob);

    let result;
    try {
      result = await new BlobClient(ctx).full(
        `/${encodeURIComponent(container)}/${encodeURIComponent(blob)}`,
        { method: "PUT", query: query({ comp: "undelete" }) },
      );
    } catch (err) {
      const message = String(err);
      if (/404/.test(message)) {
        throw new Error(
          `${message}\n\nA 404 here has two meanings that look identical: the blob was never ` +
            "soft-deleted (so there is nothing to restore), or the account has no soft-delete " +
            "policy at all (so nothing was ever kept). `blob-list` with `deleted` in its " +
            "`include` shows what is actually recoverable",
        );
      }
      throw err;
    }

    ctx.log("info", "restored a soft-deleted Azure blob", { name: blob });

    return { restored: true, name: blob, etag: result.headers["etag"] };
  },
};

export default action;
