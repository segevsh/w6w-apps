import { need, seg } from "../lib/client.ts";
import { idParam, listAction } from "../lib/factory.ts";

/** Each tagging links to one tagged person; the person is NOT embedded, only linked. */
export default listAction({
  key: "tagging-list",
  resource: "tagging",
  title: "List Taggings",
  description:
    "List the taggings on a tag, one per tagged person, 25 per page. A tagging carries its own id (needed to remove the tag) but only a link to the person.",
  params: [idParam("tagId", "Tag ID")],
  path: (i) => `/tags/${seg(need(i, "tagId"))}/taggings`,
});
