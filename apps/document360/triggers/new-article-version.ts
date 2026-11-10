import type { ActionDefinition } from "@w6w/types";
import articleVersionList from "../actions/article-version-list.ts";
import { boundedListSnapshot } from "../lib/triggers.ts";

export default boundedListSnapshot({
  key: "new-article-version",
  title: "New Article Version",
  description: "The run gets each new version of the article you choose.",
  action: articleVersionList as unknown as ActionDefinition,
  params: articleVersionList.params,
  input: (params) => params,
  output: [{ key: "id", type: "string", label: "Article version ID" }],
  sample: { id: "article-version-101", version_number: 2 },
});
