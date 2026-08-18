import type { Param } from "@w6w/types";

/** Every index-scoped action takes this. */
export const INDEX_PARAM: Param = {
  key: "indexName",
  label: "Index",
  type: "string",
  required: true,
  default: "",
  placeholder: "products",
  hint: "The index name, as it appears in the Algolia dashboard.",
};
