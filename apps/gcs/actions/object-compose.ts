import type { ActionDefinition } from "@w6w/types";
import { bucketName, csv, objectName, query, StorageClient } from "../lib/client.ts";
import { BUCKET_PARAM } from "../lib/params.ts";

/**
 * `POST /b/{bucket}/o/{destination}/compose` — concatenate objects
 * server-side.
 *
 * ## Appending, in a store that has no append
 *
 * Objects are immutable: there is no way to add a line to one. Composition is
 * the answer — write each chunk as its own object, then compose them into one.
 * The bytes never travel through the caller, and the result is a single object
 * whose contents are the sources joined in the order given.
 *
 * That makes the pattern for an accumulating log or a chunked upload:
 * `part-000`, `part-001`, …, composed into `full.log`, sources then deleted.
 *
 * ## The limits are real and low
 *
 * **32 sources per call.** More than that means composing in rounds —
 * compose 32, then compose the results — and a composite may be composed
 * again up to a **1024-component** total. This action refuses at 32 rather
 * than passing through an error about a "component count".
 *
 * ## Everything must be in one bucket, with the same storage class
 *
 * Sources and destination. Cross-bucket composition does not exist, and mixed
 * classes are rejected.
 *
 * ## A composed object has no MD5
 *
 * Only a CRC32C. Composition does not compute an MD5, so a pipeline that
 * verifies uploads by MD5 fails on exactly the objects it assembled itself,
 * with a missing field rather than a mismatch.
 */
const MAX_SOURCES = 32;

const action: ActionDefinition = {
  key: "object-compose",
  type: "perform",
  resource: "object",
  title: "Compose objects",
  description:
    "Concatenate up to 32 objects into one, server-side — the only way to append in a store " +
    "whose objects are immutable. The result has a CRC32C but NO MD5.",
  idempotent: true,
  params: [
    BUCKET_PARAM,
    {
      key: "sources",
      label: "Source Objects",
      type: "string",
      required: true,
      default: "",
      placeholder: "part-000, part-001, part-002",
      hint: "Comma-separated, IN ORDER — the result is their contents joined in this sequence. " +
        "Up to 32, all in this bucket.",
    },
    {
      key: "destination",
      label: "Destination Object",
      type: "string",
      required: true,
      default: "",
      hint: "May be one of the sources, which is how an accumulating object grows.",
    },
    {
      key: "contentType",
      label: "Content Type",
      type: "string",
      default: "",
      hint: "Not inherited from the sources — set it, or the result has none.",
    },
    {
      key: "ifGenerationMatch",
      label: "Only if the destination is unchanged",
      type: "string",
      default: "",
      advanced: true,
      hint: "A generation. Essential when appending to the destination itself, or two concurrent " +
        "appends silently lose one.",
    },
  ],
  output: [
    { key: "object", type: "object", label: "The composed object" },
    { key: "name", type: "string", label: "Its name" },
    { key: "size", type: "number", label: "Bytes" },
    { key: "componentCount", type: "number", label: "How many pieces it is made of" },
    { key: "crc32c", type: "string", label: "The only checksum a composed object has" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const bucket = bucketName(p.bucket);
    const destination = objectName(p.destination, "destination");
    const sources = csv(p.sources);
    if (!sources || !sources.length) {
      throw new Error("`sources` must name at least one object");
    }
    if (sources.length > MAX_SOURCES) {
      throw new Error(
        `\`sources\` names ${sources.length} objects and Cloud Storage composes at most ` +
          `${MAX_SOURCES} per call. Compose in rounds — ${MAX_SOURCES} at a time, then compose ` +
          "the results — up to a total of 1024 components",
      );
    }

    const contentType = String(p.contentType ?? "").trim();
    const object = await new StorageClient(ctx).request<{
      name?: string;
      size?: string;
      componentCount?: number;
      crc32c?: string;
    }>(
      `/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(destination)}/compose`,
      {
        method: "POST",
        query: query({ ifGenerationMatch: p.ifGenerationMatch }),
        body: {
          sourceObjects: sources.map((name) => ({ name })),
          // Not inherited — an unset type stays unset.
          destination: contentType ? { contentType } : {},
        },
      },
    );

    ctx.log("info", "composed a Cloud Storage object", {
      sourceCount: sources.length,
      componentCount: object?.componentCount,
    });

    return {
      object,
      name: object?.name ?? destination,
      size: Number(object?.size ?? 0),
      componentCount: object?.componentCount,
      // There is no md5Hash on a composed object, only this.
      crc32c: object?.crc32c,
    };
  },
};

export default action;
