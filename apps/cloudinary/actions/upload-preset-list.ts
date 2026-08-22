import type { ActionDefinition } from "@w6w/types";
import { CloudinaryClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /upload_presets` — the stored upload settings.
 *
 * An upload preset bundles everything an upload can be told to do — incoming
 * transformations, folder, tags, moderation, auto-tagging, format limits — into
 * a name that `asset-upload` can pass instead of a dozen parameters. Changing
 * the preset changes every future upload that uses it, which is the point.
 *
 * The `unsigned` flag is the one to read: an unsigned preset can be used by a
 * browser with no credential at all, which is how direct-from-the-user uploads
 * work — and, if enabled carelessly, how anyone with the cloud name can write
 * to the library.
 */
const action: ActionDefinition = {
  key: "upload-preset-list",
  type: "read",
  resource: "account",
  title: "List upload presets",
  description:
    "Stored upload settings by name, for Upload Asset's preset field. The `unsigned` flag marks " +
    "presets anyone with the cloud name can use.",
  params: [...LIST_PARAMS],
  output: [
    { key: "presets", type: "array", label: "Upload presets" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    const presets = await new CloudinaryClient(ctx).requestAll(
      "/upload_presets",
      "presets",
      {},
      returnAll ? Infinity : limit,
    );
    return { presets };
  },
};

export default action;
