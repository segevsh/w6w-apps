import type { ActionDefinition } from "@w6w/types";
import { DropboxSignClient } from "../lib/client.ts";

/**
 * `POST /signature_request/remove/{signature_request_id}` — verified against
 * the official OpenAPI document (`signatureRequestRemove`).
 *
 * **This is the destructive one.** It removes your account's access to a
 * *completed* signature request: the request disappears from the account and
 * its files can no longer be downloaded through the API. It is not a cancel and
 * it is not undoable. Download anything you need first — `signature-request-
 * files-get` returns a link while you still have access.
 */
const action: ActionDefinition = {
  key: "signature-request-remove",
  type: "perform",
  resource: "signature-request",
  title: "Remove access to a signature request",
  description:
    "Permanently remove this account's access to a COMPLETED signature request and its files.",
  idempotent: true,
  params: [
    {
      key: "signatureRequestId",
      label: "Signature Request ID",
      type: "string",
      required: true,
      default: "",
      hint: "IRREVERSIBLE. The request and its files become inaccessible to this account.",
    },
    {
      key: "confirm",
      label: "I understand this cannot be undone",
      type: "boolean",
      required: true,
      default: false,
      hint: "Must be on. Guards against a blank field removing the wrong request.",
    },
  ],
  output: [
    { key: "signature_request_id", type: "string", label: "Signature request ID" },
    { key: "removed", type: "boolean", label: "Removed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.signatureRequestId ?? "").trim();
    if (!id) throw new Error("`signatureRequestId` is required");
    if (p.confirm !== true) {
      throw new Error("`confirm` must be true — removing access cannot be undone");
    }

    ctx.log("warn", "removing access to a Dropbox Sign signature request", { id });

    await new DropboxSignClient(ctx).request(
      `/signature_request/remove/${encodeURIComponent(id)}`,
      { method: "POST" },
    );
    return { signature_request_id: id, removed: true };
  },
};

export default action;
