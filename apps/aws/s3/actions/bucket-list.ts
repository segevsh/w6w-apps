import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection } from "../lib/connection.ts";
import { xmlBlocks, xmlError, xmlText } from "../lib/xml.ts";

/**
 * ListBuckets — `GET /` with no bucket in the path.
 * https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListBuckets.html
 *
 * Returns every bucket the account owns, in every region (S3 buckets are a
 * global-per-account namespace; only object access is region-scoped). No
 * pagination params: a standard account is limited to a few hundred buckets
 * by default (raisable, but ListBuckets already returns up to 10,000 in one
 * call), so this app does not implement the newer `max-buckets` /
 * `continuation-token` pagination for this specific call.
 */
interface Output {
  buckets: Array<{ name: string; creationDate?: string }>;
  ownerId?: string;
  ownerDisplayName?: string;
}

const action: ActionDefinition<Record<string, never>, Output> = {
  key: "bucket-list",
  type: "search",
  resource: "bucket",
  title: "List Buckets",
  description: "List every S3 bucket owned by this account.",
  output: [
    { key: "buckets", type: "array", label: "Buckets" },
    { key: "ownerId", type: "string", label: "Owner ID" },
    { key: "ownerDisplayName", type: "string", label: "Owner display name" },
  ],

  async execute(_input, ctx) {
    const host = hostFromConnection(ctx.connection);
    ctx.log("info", "listing S3 buckets", { host });

    const res = await ctx.fetch(`https://${host}/`);
    const body = await res.text();
    if (!res.ok) {
      const err = xmlError(body);
      throw new Error(
        `ListBuckets returned ${res.status}${err?.message ? `: ${err.message}` : ""}`,
      );
    }

    const ownerBlock = xmlBlocks(body, "Owner")[0];
    const bucketsBlock = xmlBlocks(body, "Buckets")[0] ?? "";
    const buckets = xmlBlocks(bucketsBlock, "Bucket").map((b) => ({
      name: xmlText(b, "Name") ?? "",
      creationDate: xmlText(b, "CreationDate"),
    }));

    return {
      buckets,
      ownerId: ownerBlock ? xmlText(ownerBlock, "ID") : undefined,
      ownerDisplayName: ownerBlock ? xmlText(ownerBlock, "DisplayName") : undefined,
    };
  },
};

export default action;
