import { makeSearchAction } from "../lib/search.ts";

export default makeSearchAction({
  key: "search-results",
  title: "Search the Web (Ranked Sources)",
  description:
    "Search the web and return ranked sources with content snippets, ready to ground an LLM.",
  outputType: "searchResults",
});
