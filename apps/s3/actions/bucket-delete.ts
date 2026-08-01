import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection } from "../lib/connection.ts";
import { xmlError } from "../lib/xml.ts";

/**
 * DeleteBucket — `DELETE /<bucket>`. Succeeds only on an empty bucket (AWS
 * returns `409 BucketNotEmpty` otherwise) and responds `204 No Content`.
 * https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteBucket.html
 */
interface Input {
  bucket: string;
}

interface Output {
  deleted: boolean;
}

const action: ActionDefinition<Input, Output> = {
  key: "bucket-delete",
  type: "perform",
  resource: "bucket",
  title: "Delete Bucket",
  description: "Delete an empty S3 bucket.",
  idempotent: true,
  params: [
    { key: "bucket", label: "Bucket Name", type: "string", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    if (!input.bucket) throw new Error("`bucket` is required");
    const host = hostFromConnection(ctx.connection);

    ctx.log("info", "deleting S3 bucket", { bucket: input.bucket });

    const res = await ctx.fetch(`https://${host}/${encodeURIComponent(input.bucket)}`, {
      method: "DELETE",
    });

    if (res.status !== 204 && !res.ok) {
      const err = xmlError(await res.text());
      throw new Error(
        `DeleteBucket returned ${res.status}${err?.message ? `: ${err.message}` : ""}`,
      );
    }

    return { deleted: true };
  },
};

export default action;
