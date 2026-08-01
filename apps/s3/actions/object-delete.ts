import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection } from "../lib/connection.ts";
import { encodeS3Key } from "../lib/s3-path.ts";
import { xmlError } from "../lib/xml.ts";

/**
 * DeleteObject — `DELETE /<bucket>/<key>`. Responds `204 No Content` whether
 * or not the key existed (S3 does not distinguish "deleted" from "was
 * already gone"), which is what makes this safe to retry.
 * https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObject.html
 */
interface Input {
  bucket: string;
  key: string;
  versionId?: string;
}

interface Output {
  deleted: boolean;
}

const action: ActionDefinition<Input, Output> = {
  key: "object-delete",
  type: "perform",
  resource: "object",
  title: "Delete Object",
  description: "Delete an object from a bucket.",
  idempotent: true,
  params: [
    { key: "bucket", label: "Bucket Name", type: "string", required: true },
    { key: "key", label: "Object Key", type: "string", required: true },
    { key: "versionId", label: "Version ID", type: "string", advanced: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    if (!input.bucket) throw new Error("`bucket` is required");
    if (!input.key) throw new Error("`key` is required");
    const host = hostFromConnection(ctx.connection);
    const query = input.versionId ? `?versionId=${encodeURIComponent(input.versionId)}` : "";

    ctx.log("info", "deleting S3 object", { bucket: input.bucket, key: input.key });

    const res = await ctx.fetch(
      `https://${host}/${encodeURIComponent(input.bucket)}/${encodeS3Key(input.key)}${query}`,
      { method: "DELETE" },
    );

    if (res.status !== 204 && !res.ok) {
      const err = xmlError(await res.text());
      throw new Error(
        `DeleteObject returned ${res.status}${err?.message ? `: ${err.message}` : ""}`,
      );
    }

    return { deleted: true };
  },
};

export default action;
