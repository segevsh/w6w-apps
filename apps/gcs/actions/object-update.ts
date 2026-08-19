import type { ActionDefinition } from "@w6w/types";
import {
  bucketName,
  emptyToUndefined,
  json,
  objectName,
  query,
  StorageClient,
} from "../lib/client.ts";
import { BUCKET_PARAM, OBJECT_PARAM } from "../lib/params.ts";

/**
 * `PATCH /b/{bucket}/o/{object}` — change an object's metadata, not its
 * contents.
 *
 * ## Metadata is mutable; the bytes are not
 *
 * Objects are immutable. Content type, cache control and custom metadata can
 * be changed in place, and doing so bumps the **metageneration** while leaving
 * the **generation** alone — which is how the two differ, and why a
 * precondition on the wrong one does not do what was intended.
 *
 * ## `metadata` replaces the whole map
 *
 * Sending `{"owner": "jane"}` to an object that also had `{"team": "ops"}`
 * leaves it with only `owner`. To remove one key, send the others; to remove
 * all, send an empty object. There is no merge, and the call succeeds either
 * way.
 *
 * ## `cacheControl` is what a signed URL and a public object are served with
 *
 * An object served through a CDN or a browser with the default cache headers is
 * cached in places the workflow cannot reach. Setting `no-store` on something
 * short-lived is the difference between a signed URL expiring and its contents
 * expiring.
 *
 * ## Storage class is changed here too, and it starts a new clock
 *
 * Moving an object to a colder class begins that class's minimum billed
 * duration afresh — 30, 90 or 365 days — regardless of how long it has already
 * existed.
 */
const action: ActionDefinition = {
  key: "object-update",
  type: "perform",
  resource: "object",
  title: "Update object metadata",
  description:
    "Change content type, cache control, custom metadata or storage class. Custom metadata " +
    "REPLACES the whole map rather than merging, and a colder storage class restarts its minimum " +
    "billed duration.",
  idempotent: true,
  params: [
    BUCKET_PARAM,
    OBJECT_PARAM,
    {
      key: "contentType",
      label: "Content Type",
      type: "string",
      default: "",
    },
    {
      key: "cacheControl",
      label: "Cache-Control",
      type: "string",
      default: "",
      placeholder: "private, max-age=0, no-store",
      hint: "What a browser or CDN does with it. For anything served by a short-lived signed " +
        "URL, `no-store` is usually what was meant.",
    },
    {
      key: "contentDisposition",
      label: "Content-Disposition",
      type: "string",
      default: "",
      advanced: true,
      hint: 'e.g. `attachment; filename="report.csv"` — makes a browser download rather than ' +
        "display it.",
    },
    {
      key: "metadata",
      label: "Custom Metadata",
      type: "json",
      default: "",
      hint: "REPLACES the whole map. Send every key you want to keep; send `{}` to clear it.",
    },
    {
      key: "storageClass",
      label: "Storage Class",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "", label: "Leave unchanged" },
        { value: "STANDARD", label: "Standard" },
        { value: "NEARLINE", label: "Nearline — restarts a 30-day minimum" },
        { value: "COLDLINE", label: "Coldline — restarts a 90-day minimum" },
        { value: "ARCHIVE", label: "Archive — restarts a 365-day minimum" },
      ],
    },
    {
      key: "ifMetagenerationMatch",
      label: "Only if metadata is unchanged",
      type: "string",
      default: "",
      advanced: true,
      hint: "A METAgeneration, not a generation — metadata edits bump the first and leave the " +
        "second alone.",
    },
  ],
  output: [
    { key: "object", type: "object", label: "The object as it now stands" },
    { key: "name", type: "string", label: "Its name" },
    { key: "generation", type: "string", label: "Unchanged — the bytes did not move" },
    { key: "metageneration", type: "string", label: "Bumped by this edit" },
    { key: "changed", type: "array", label: "The fields this call submitted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const bucket = bucketName(p.bucket);
    const name = objectName(p.object);

    const metadata = json(p.metadata, "metadata");
    if (metadata !== undefined && (typeof metadata !== "object" || Array.isArray(metadata))) {
      throw new Error("`metadata` must be an object of string key/value pairs");
    }

    const body = emptyToUndefined({
      contentType: p.contentType,
      cacheControl: p.cacheControl,
      contentDisposition: p.contentDisposition,
      storageClass: p.storageClass,
      // Replaces the map; `{}` clears it, which `emptyToUndefined` would not
      // otherwise let through.
      metadata: metadata as Record<string, unknown> | undefined,
    }) ?? (metadata !== undefined ? { metadata } : undefined);
    if (!body) throw new Error("nothing to change — give at least one field");

    if (metadata !== undefined) {
      ctx.log(
        "info",
        "replacing this object's custom metadata — any key not in this call is now gone",
        { name, keyCount: Object.keys(metadata as Record<string, unknown>).length },
      );
    }

    const object = await new StorageClient(ctx).request<{
      name?: string;
      generation?: string;
      metageneration?: string;
    }>(`/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(name)}`, {
      method: "PATCH",
      query: query({ ifMetagenerationMatch: p.ifMetagenerationMatch }),
      body,
    });

    return {
      object,
      name: object?.name ?? name,
      generation: object?.generation,
      metageneration: object?.metageneration,
      changed: Object.keys(body),
    };
  },
};

export default action;
