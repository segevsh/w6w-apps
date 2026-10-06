import { makeSearchAction } from "../lib/search.ts";

export default makeSearchAction({
  key: "search-answer",
  title: "Search the Web (Sourced Answer)",
  description:
    "Search the web and return a natural-language answer with the sources behind it, optionally " +
    "with inline citations.",
  outputType: "sourcedAnswer",
});
