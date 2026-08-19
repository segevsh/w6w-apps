import type { ActionDefinition } from "@w6w/types";
import { bucketName, objectName, query, StorageClient, UPLOAD_BASE } from "../lib/client.ts";
import { BUCKET_PARAM } from "../lib/params.ts";

/**
 * `POST /upload/storage/v1/b/{bucket}/o?uploadType=media` — write an object.
 *
 * ## The upload path is a different path
 *
 * Content goes to `/upload/storage/v1/…`; everything else lives at
 * `/storage/v1/…`. Posting bytes to the ordinary path does not upload
 * anything, and the error mentions neither uploads nor paths. This is the
 * single most common reason a hand-built Cloud Storage upload fails.
 *
 * ## An upload overwrites, silently, and returns 200
 *
 * There is no "already exists" error by default. Writing to a name that is in
 * use replaces the object, and unless the bucket has versioning on, the
 * previous contents are gone. `ifNotExists` sends `ifGenerationMatch=0`, which
 * turns that into a **412** — a failure that means the safety worked.
 *
 * For a read-modify-write, `ifGenerationMatch` with the generation from
 * `object-get` is the compare-and-swap: the write succeeds only if nothing
 * changed in between.
 *
 * ## The name goes in the query string, not the path
 *
 * On upload the object does not exist yet, so there is nothing to address. The
 * name is `?name=`, which also means its slashes need no special handling
 * here — unlike every other object call in this app.
 */
const action: ActionDefinition = {
  key: "object-upload",
  type: "perform",
  resource: "object",
  title: "Upload an object",
  description:
    "Write an object from text. This OVERWRITES an existing name and returns 200 — turn on " +
    "`ifNotExists`, or pass a generation, to make a conflicting write fail with a 412 instead.",
  idempotent: true,
  params: [
    BUCKET_PARAM,
    {
      key: "name",
      label: "Object Name",
      type: "string",
      required: true,
      default: "",
      placeholder: "reports/2026-08/summary.json",
      hint: "The full name. Slashes are just characters — they do not create anything.",
    },
    {
      key: "content",
      label: "Content",
      type: "string",
      required: true,
      default: "",
      hint: "Text. This action does not carry binary.",
    },
    {
      key: "contentType",
      label: "Content Type",
      type: "string",
      default: "text/plain",
      hint: "What a browser or a signed-URL recipient will treat it as.",
    },
    {
      key: "ifNotExists",
      label: "Only if it does not exist",
      type: "boolean",
      default: false,
      hint: "Sends `ifGenerationMatch=0`. A conflicting write then fails with 412 instead of " +
        "silently replacing what is there.",
    },
    {
      key: "ifGenerationMatch",
      label: "Only if unchanged since",
      type: "string",
      default: "",
      advanced: true,
      hint: "A generation from `object-get` — a compare-and-swap. The write fails with 412 if " +
        "anything changed in between.",
    },
    {
      key: "cacheControl",
      label: "Cache-Control",
      type: "string",
      default: "",
      advanced: true,
    },
    {
      key: "metadata",
      label: "Custom Metadata",
      type: "json",
      default: "",
      advanced: true,
      hint: "Arbitrary key/value pairs stored with the object. Set on a second call, since a " +
        "media upload carries content only.",
    },
  ],
  output: [
    { key: "object", type: "object", label: "The object as written" },
    { key: "name", type: "string", label: "Its name" },
    { key: "generation", type: "string", label: "The new version's id" },
    { key: "size", type: "number", label: "Bytes stored" },
    { key: "overwroteExisting", type: "boolean", label: "Whether a previous version existed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const bucket = bucketName(p.bucket);
    const name = objectName(p.name, "name");
    const content = String(p.content ?? "");
    const contentType = String(p.contentType ?? "").trim() || "text/plain";

    const ifNotExists = p.ifNotExists === true;
    const generation = String(p.ifGenerationMatch ?? "").trim();
    if (ifNotExists && generation) {
      throw new Error(
        "give `ifNotExists` or `ifGenerationMatch`, not both — the first means 'only if absent' " +
          "and the second means 'only if it is still this version'",
      );
    }

    const client = new StorageClient(ctx);
    const uploaded = await client.request<{
      name?: string;
      generation?: string;
      size?: string;
      metageneration?: string;
    }>(`/b/${encodeURIComponent(bucket)}/o`, {
      method: "POST",
      // The upload path, which is not where the rest of this API lives.
      base: UPLOAD_BASE,
      query: query({
        uploadType: "media",
        // The object does not exist yet, so its name is a parameter.
        name,
        ifGenerationMatch: ifNotExists ? 0 : (generation || undefined),
      }),
      raw: { body: content, contentType },
    });

    // Generation 1 is the first write of this name; anything else replaced
    // something, whether or not versioning kept it.
    const overwroteExisting = Number(uploaded?.metageneration ?? 1) > 1;

    let object = uploaded;
    const metadata = p.metadata === undefined || p.metadata === ""
      ? undefined
      : typeof p.metadata === "string"
      ? JSON.parse(String(p.metadata)) as Record<string, unknown>
      : p.metadata as Record<string, unknown>;
    const cacheControl = String(p.cacheControl ?? "").trim();
    if (metadata || cacheControl) {
      // A media upload carries content only, so metadata is a second call.
      object = await client.request(
        `/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(name)}`,
        {
          method: "PATCH",
          body: {
            ...(metadata ? { metadata } : {}),
            ...(cacheControl ? { cacheControl } : {}),
          },
        },
      );
    }

    // The name and the size. The contents are the caller's.
    ctx.log("info", "wrote a Cloud Storage object", {
      name,
      size: new TextEncoder().encode(content).length,
    });

    return {
      object,
      name: object?.name ?? name,
      generation: object?.generation,
      size: Number(object?.size ?? 0),
      overwroteExisting,
    };
  },
};

export default action;
