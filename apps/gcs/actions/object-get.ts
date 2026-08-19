import type { ActionDefinition } from "@w6w/types";
import { bucketName, earlyDeletionNote, objectName, query, StorageClient } from "../lib/client.ts";
import { BUCKET_PARAM, OBJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /b/{bucket}/o/{object}` — an object's metadata, not its contents.
 *
 * ## The generation is the version, and it is how a safe write is done
 *
 * Every write produces a new `generation`. Reading it and passing it back as
 * `ifGenerationMatch` on the next write means "only if nobody else changed
 * this in between" — a compare-and-swap, and the only concurrency control this
 * API has. Without it, two workflows writing the same object both succeed and
 * one result is simply lost.
 *
 * ## `md5Hash` is base64, and composite objects do not have one
 *
 * The value is base64-encoded, not hex, so comparing it against a hex digest
 * from anywhere else always fails. And an object built by `object-compose` has
 * only a CRC32C — composition does not produce an MD5, so a pipeline that
 * verifies by MD5 breaks on exactly the objects it assembled itself.
 *
 * ## `size` is a string
 *
 * Because an object can exceed what a JSON number represents safely. Comparing
 * it numerically without converting works until the day it does not.
 */
const action: ActionDefinition = {
  key: "object-get",
  type: "read",
  resource: "object",
  title: "Get object metadata",
  description:
    "One object's metadata. `generation` is what makes a safe overwrite possible; `md5Hash` is " +
    "BASE64 not hex, and a composed object has none at all.",
  params: [
    BUCKET_PARAM,
    OBJECT_PARAM,
    {
      key: "generation",
      label: "Generation",
      type: "string",
      default: "",
      advanced: true,
      hint: "A specific version. Blank is the current one.",
    },
    {
      key: "softDeleted",
      label: "Soft-Deleted",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Read an object inside its soft-delete window. Needs the generation as well.",
    },
  ],
  output: [
    { key: "object", type: "object", label: "The metadata" },
    { key: "name", type: "string", label: "Its full name, slashes included" },
    { key: "size", type: "number", label: "Bytes, converted from the API's string" },
    { key: "contentType", type: "string", label: "What it claims to be" },
    { key: "generation", type: "string", label: "Pass back as a precondition for a safe write" },
    { key: "md5Hash", type: "string", label: "BASE64, and absent on a composed object" },
    { key: "crc32c", type: "string", label: "Always present, including on composed objects" },
    { key: "storageClass", type: "string", label: "This object's class, not the bucket's" },
    { key: "minimumDurationNote", type: "string", label: "What deleting it early costs" },
    { key: "updated", type: "string", label: "When it last changed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const bucket = bucketName(p.bucket);
    const name = objectName(p.object);

    const object = await new StorageClient(ctx).request<{
      name?: string;
      size?: string;
      contentType?: string;
      generation?: string;
      md5Hash?: string;
      crc32c?: string;
      storageClass?: string;
      updated?: string;
    }>(
      // The slashes in an object name must be encoded, or this is another URL.
      `/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(name)}`,
      {
        query: query({
          generation: p.generation,
          softDeleted: p.softDeleted === true ? true : undefined,
        }),
      },
    );

    return {
      object,
      name: object?.name,
      // A string in the API, because it can exceed a safe integer.
      size: Number(object?.size ?? 0),
      contentType: object?.contentType,
      generation: object?.generation,
      md5Hash: object?.md5Hash,
      crc32c: object?.crc32c,
      storageClass: object?.storageClass,
      minimumDurationNote: earlyDeletionNote(object?.storageClass),
      updated: object?.updated,
    };
  },
};

export default action;
