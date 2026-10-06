import type { ActionDefinition } from "@w6w/types";
import { DubClient, strList } from "../lib/client.ts";
import { LINK_FIELD_PARAMS, linkBody, type LinkFields, urlParam } from "../lib/links.ts";

type Input = LinkFields & { linkIds?: string[] | string; externalIds?: string[] | string };

/** Fields that identify a single link cannot be applied to many. */
const SINGLE_LINK_ONLY = new Set(["domain", "key", "externalId"]);

/** `PATCH /links/bulk` — apply the same changes to up to 100 links. */
const linkBulkUpdate: ActionDefinition<Input> = {
  key: "link-bulk-update",
  type: "perform",
  resource: "link",
  title: "Bulk Update Links",
  description:
    "Apply the same changes to up to 100 links, selected by link ID or external ID. Only the fields you set change.",
  idempotent: true,
  params: [
    {
      key: "linkIds",
      label: "Link IDs",
      type: "array",
      item: { type: "string" },
      hint: "Takes precedence over external IDs.",
    },
    {
      key: "externalIds",
      label: "External IDs",
      type: "array",
      item: { type: "string" },
      hint: "Your own IDs for the links.",
    },
    urlParam(false),
    ...LINK_FIELD_PARAMS.filter((p) => !SINGLE_LINK_ONLY.has(p.key)),
  ],
  output: [{ key: "links", type: "array", label: "The updated links" }],

  async execute(input, ctx) {
    const linkIds = strList(input.linkIds);
    const externalIds = strList(input.externalIds);
    if (!linkIds && !externalIds) throw new Error("Give at least one link ID or external ID.");
    const data = linkBody(input);
    for (const k of SINGLE_LINK_ONLY) delete data[k];
    const links = await new DubClient(ctx).request("PATCH", "/links/bulk", {
      body: { ...(linkIds ? { linkIds } : {}), ...(externalIds ? { externalIds } : {}), data },
    });
    return { links };
  },
};

export default linkBulkUpdate;
