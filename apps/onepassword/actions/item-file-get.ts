import type { ActionDefinition } from "@w6w/types";
import { OnePasswordClient, surfaceOf } from "../lib/client.ts";

/**
 * `GET /v1/vaults/{vaultId}/items/{itemId}/files/{fileId}/content` — an
 * attachment's bytes.
 *
 * ## This returns a secret, and it is usually the most sensitive one
 *
 * The attachments on a credentials item are private keys, certificates and
 * service-account files. Fetching one puts it into the run's data in full;
 * there is no partial form and nothing to redact, because the whole file is the
 * secret.
 *
 * So this action is deliberately explicit about what it is doing, refuses
 * anything large enough to be a mistake, and — like every action here — never
 * logs a byte of it.
 *
 * ## The response is bytes, not JSON
 *
 * Unlike everything else on the Connect API. It is fetched directly rather than
 * through the client's JSON path and returned base64-encoded, with the content
 * type Connect reported.
 */
const MAX_BYTES = 4_000_000;

const action: ActionDefinition = {
  key: "item-file-get",
  type: "read",
  resource: "file",
  title: "Get a file's contents",
  description:
    "An attachment's bytes, base64-encoded. There is nothing to redact — on a credentials item " +
    "the whole file is the secret, usually a private key or a certificate.",
  params: [
    { key: "vaultId", label: "Vault", type: "string", required: true, default: "" },
    { key: "itemId", label: "Item", type: "string", required: true, default: "" },
    {
      key: "fileId",
      label: "File",
      type: "string",
      required: true,
      default: "",
      hint: "From `item-file-list`.",
    },
  ],
  output: [
    { key: "data", type: "string", label: "Base64-encoded bytes" },
    { key: "size", type: "number", label: "Bytes before encoding" },
    { key: "contentType", type: "string", label: "What Connect reported it as" },
  ],

  async execute(input, ctx) {
    // The same surface guard the client applies, before touching the network.
    if (surfaceOf(ctx.connection) !== "connect") {
      throw new Error(
        "`item-file-get` needs a **Connect** connection, and this one is for the Events API",
      );
    }
    const client = new OnePasswordClient(ctx);
    const base = client.requireConnect("item-file-get");
    const p = input as Record<string, unknown>;
    const vaultId = String(p.vaultId ?? "").trim();
    const itemId = String(p.itemId ?? "").trim();
    const fileId = String(p.fileId ?? "").trim();
    if (!vaultId) throw new Error("`vaultId` is required");
    if (!itemId) throw new Error("`itemId` is required");
    if (!fileId) throw new Error("`fileId` is required");

    const url = `${base}/v1/vaults/${encodeURIComponent(vaultId)}/items/` +
      `${encodeURIComponent(itemId)}/files/${encodeURIComponent(fileId)}/content`;
    const res = await ctx.fetch(url, { headers: { accept: "*/*" } });
    if (!res.ok) {
      await res.body?.cancel();
      throw new Error(`1Password ${res.status} fetching file content`);
    }

    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    const buffer = new Uint8Array(await res.arrayBuffer());
    if (buffer.length > MAX_BYTES) {
      throw new Error(
        `the file is ${buffer.length} bytes, over the ${MAX_BYTES} ceiling this action applies. ` +
          "An attachment that large on a credentials item is more likely a mistake than a key",
      );
    }

    let binary = "";
    for (const byte of buffer) binary += String.fromCharCode(byte);

    // The size only. There is nothing about this file that is safe to log.
    ctx.log("warn", "read a 1Password file attachment in full", { size: buffer.length });

    return { data: btoa(binary), size: buffer.length, contentType };
  },
};

export default action;
