import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listCollections from "../actions/list-collections.ts";

/**
 * `list-collections`: `GET /sites/{site_id}/collections` returns every CMS collection of the
 * site in one response with no paging arguments
 * (https://developers.webflow.com/data/reference/cms/collections/list, verified 2026-11-10), so
 * the whole set is one bounded request. Additions only.
 */
const trigger: TriggerDefinition<{ siteId: string }> = {
  key: "new-collection",
  title: "New CMS Collection",
  description:
    "The run gets each CMS collection newly created on the chosen Webflow site (renames and removals are ignored).",
  params: [{ key: "siteId", label: "Site ID", type: "string", required: true }],
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Collection ID" },
    { key: "values", type: "object", label: "Collection" },
  ],
  sample: {
    change: "added",
    key: "65e0f1d2a3b4c5d6e7f80901",
    values: { id: "65e0f1d2a3b4c5d6e7f80901", displayName: "Blog Posts", slug: "posts" },
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const result = await listCollections.execute({ siteId: params.siteId }, ctx) as {
      collections?: Array<{ id?: string; [key: string]: unknown }>;
    };
    return await pollSnapshot({
      state,
      rows: (result.collections ?? []).flatMap((c) =>
        c.id ? [{ key: String(c.id), values: c }] : []
      ),
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
