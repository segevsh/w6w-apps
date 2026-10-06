import { makeSearchAction } from "../lib/search.ts";

export default makeSearchAction({
  key: "search-structured",
  title: "Search the Web (Structured JSON)",
  description:
    "Search the web and return JSON matching a JSON Schema you supply, optionally with the " +
    "sources used.",
  outputType: "structured",
});
