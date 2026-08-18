import type { ActionDefinition } from "@w6w/types";
import { CloudinaryClient } from "../lib/client.ts";
import { LIST_PARAMS, RESOURCE_TYPE_PARAM } from "../lib/params.ts";

/**
 * `GET /tags/{resource_type}` — every tag in use, per resource type.
 *
 * Tags are the closest thing Cloudinary has to a taxonomy, and they are
 * **per resource type**: the same word on an image and on a video is two
 * entries here. That trips up any workflow that assumes one namespace.
 *
 * The `prefix` filter is what makes namespaced tags worth adopting —
 * `campaign:spring`, `status:approved` — since it turns a flat tag list into a
 * queryable one.
 */
const action: ActionDefinition = {
  key: "tag-list",
  type: "read",
  resource: "tag",
  title: "List tags",
  description:
    "Every tag in use for a resource type. Tags are per resource type, so the same word on an " +
    "image and a video is two entries.",
  params: [
    RESOURCE_TYPE_PARAM,
    {
      key: "prefix",
      label: "Prefix",
      type: "string",
      default: "",
      placeholder: "campaign:",
      hint: "Which is the argument for namespacing tags in the first place.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "tags", type: "array", label: "Tags" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const resourceType = String(p.resourceType ?? "image");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const tags = await new CloudinaryClient(ctx).requestAll(
      `/tags/${encodeURIComponent(resourceType)}`,
      "tags",
      { query: { prefix: String(p.prefix ?? "") || undefined } },
      returnAll ? Infinity : limit,
    );
    return { tags };
  },
};

export default action;
