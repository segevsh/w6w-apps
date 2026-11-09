import { pollFromListAction } from "../../_shared/poll/mod.ts";
import linkList from "../actions/link-list.ts";

export default pollFromListAction({
  key: "new-link",
  title: "New Link",
  description: "The run gets each newly created share link.",
  action: linkList,
  input: () => ({ createdAfter: "1970-01-01T00:00:00Z", offset: 0, count: 100 }),
  items: (result) =>
    Array.isArray((result as { links?: unknown[] }).links)
      ? (result as { links: unknown[] }).links
      : [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; link_id?: unknown }).id ?? (item as { link_id?: unknown }).link_id ??
        "",
    ),
  output: [{ key: "id", type: "string", label: "Link ID" }],
  sample: { id: "link_1" },
  maxPages: 1,
});
