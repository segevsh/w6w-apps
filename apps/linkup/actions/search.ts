import { makeSearchAction } from "../lib/search.ts";

export default makeSearchAction({
  key: "search",
  title: "Search the Web",
  description:
    "Search the web with Linkup at a chosen depth (flash, fast, standard, deep) and return ranked " +
    "sources, a sourced answer or schema-shaped JSON, depending on the output type.",
});
