import type { ActionDefinition } from "@w6w/types";
import { SNAPSHOT_PAGE, snapshotTrigger } from "../lib/triggers.ts";
import tagList from "../actions/tag-list.ts";

interface Tag {
  tag_id?: string;
  title?: string;
}

interface Params {
  organizationId?: string;
}

// VideoAsk: GET /tags has no documented order or filter beyond `title`; it pages with limit/offset
// (https://developers.videoask.com/, Tags > Retrieve tags, verified 2026-11-10). An account holds a
// few dozen tags, so every check reads them all and diffs the ids (snapshot, brief 9.1 c).
export default snapshotTrigger<Tag, Params>({
  key: "new-tag",
  title: "New Tag",
  description: "The run gets each newly created contact tag.",
  params: [{ key: "organizationId", label: "Organization ID", type: "string" }],
  async fetchPage(offset, ctx, params) {
    const res = await (tagList as unknown as ActionDefinition).execute({
      limit: SNAPSHOT_PAGE,
      offset,
      organizationId: params.organizationId,
    }, ctx) as { results?: Tag[] };
    return res.results ?? [];
  },
  idOf: (t) => String(t.tag_id ?? ""),
  output: [
    { key: "tag_id", type: "string", label: "Tag ID" },
    { key: "title", type: "string", label: "Title" },
  ],
  sample: { tag_id: "tag_1", title: "My tag" },
});
