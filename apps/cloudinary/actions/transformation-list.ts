import type { ActionDefinition } from "@w6w/types";
import { CloudinaryClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /transformations` — every transformation the account knows about.
 *
 * Two kinds share this list and they are not the same thing:
 *
 *   - **Named** transformations (`named: true`) are definitions somebody
 *     created deliberately, usable in a URL as `t_thumbnail`. Changing one
 *     changes every URL that references it, which is exactly why they exist.
 *   - **Unnamed** entries are transformations Cloudinary has *seen* in a
 *     delivery URL and generated a derived asset for. They are a record of what
 *     the account is spending storage on, not a design.
 *
 * `used: true` marks a transformation with derived assets behind it. That is
 * the field to look at before deleting one, since the derived copies go with
 * it.
 */
const action: ActionDefinition = {
  key: "transformation-list",
  type: "read",
  resource: "transformation",
  title: "List transformations",
  description:
    "Named transformations and the unnamed ones Cloudinary has generated from delivery URLs — " +
    "the latter being a record of storage spent, not a design.",
  params: [
    {
      key: "named",
      label: "Named Only",
      type: "boolean",
      default: false,
      hint: "Filters out the transformations Cloudinary generated from URL traffic.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "transformations", type: "array", label: "Transformations" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const transformations = await new CloudinaryClient(ctx).requestAll(
      "/transformations",
      "transformations",
      { query: { named: p.named === true ? true : undefined } },
      returnAll ? Infinity : limit,
    );
    return { transformations };
  },
};

export default action;
