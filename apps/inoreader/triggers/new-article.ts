import { pollFromListAction } from "../../_shared/poll/mod.ts";
import streamContents from "../actions/stream-contents.ts";

export default pollFromListAction<{ streamId?: string }>({
  key: "new-article",
  title: "New Article",
  description: "The run gets each new article in the selected stream.",
  action: streamContents as never,
  input: (params: { streamId?: string }) => ({
    streamId: params.streamId ?? "user/-/state/com.google/reading-list",
    count: 100,
    order: "newest",
  }),
  params: [{ key: "streamId", label: "Stream ID", type: "string" }],
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Article ID" }],
  sample: { id: "tag:google.com,2005:reader/item/1", title: "Article" },
  maxPages: 1,
});
