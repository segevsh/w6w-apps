import type { ActionDefinition } from "@w6w/types";
import { SNAPSHOT_PAGE, snapshotTrigger } from "../lib/triggers.ts";
import listCollections from "../actions/list-collections.ts";

interface Collection {
  id?: string;
  displayName?: string;
}

// Wix Data List Data Collections returns every collection of the site, offset-paged
// (https://dev.wix.com/docs/api-reference/business-solutions/cms/collection-management/data-collections/list-data-collections,
// verified 2026-11-10). A site has a few dozen collections, so every check reads them all and
// diffs the ids (snapshot, brief 9.1 c); the first check seeds and emits nothing.
export default snapshotTrigger<Collection>({
  key: "new-collection",
  title: "New CMS Collection",
  description: "The run gets each newly created CMS data collection.",
  async fetchPage(offset, ctx) {
    const res = await (listCollections as unknown as ActionDefinition).execute({
      limit: SNAPSHOT_PAGE,
      offset,
    }, ctx) as { collections?: Collection[] };
    return res.collections ?? [];
  },
  idOf: (c) => String(c.id ?? ""),
  output: [
    { key: "id", type: "string", label: "Collection ID" },
    { key: "displayName", type: "string", label: "Display name" },
  ],
  sample: { id: "Cities", displayName: "Cities" },
});
