import { pollFromListAction } from "../../_shared/poll/mod.ts";
import crawlList from "../actions/crawl-list.ts";

export default pollFromListAction({
  key: "new-crawl",
  title: "New Crawl",
  description: "The run gets each newly created crawl job.",
  action: crawlList,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { data?: { data?: unknown[] } }).data?.data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Crawl ID" }],
  sample: { id: "crawl_123" },
  maxPages: 1,
});
