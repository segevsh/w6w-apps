import { searchAction } from "../lib/repos.ts";

/** Search the Hub for datasets. */
export default searchAction({
  kind: "datasets",
  key: "dataset-search",
  title: "Search datasets",
  description:
    "Find datasets on the Hub. Tags carry the licence, language and task, and all of a tag list " +
    "must match — a long one usually returns nothing.",
});
