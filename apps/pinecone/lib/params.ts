import type { Param } from "@w6w/types";

/**
 * The index a data-plane action works on, and the escape hatch that skips the
 * lookup its host costs.
 *
 * Every data call needs the index's own hostname, which only the control plane
 * knows. Naming the index is what a workflow can actually do; pasting the host
 * is what a hot loop should do once it has one.
 */
export const INDEX_PARAMS: Param[] = [
  {
    key: "indexName",
    label: "Index",
    type: "string",
    required: true,
    default: "",
    placeholder: "product-embeddings",
    hint: "The index name. Its data-plane host is looked up once per run.",
  },
  {
    key: "indexHost",
    label: "Index Host",
    type: "string",
    default: "",
    advanced: true,
    placeholder: "product-embeddings-4xdf9s2.svc.aped-4627-b74a.pinecone.io",
    hint: "Skips the lookup. `index-get` returns it as `host`, and it never changes for the " +
      "life of an index.",
  },
];

/**
 * The namespace a record operation applies to.
 *
 * Pinecone's default namespace is the empty string, and that is a real
 * namespace rather than "all of them": a record written with no namespace is
 * invisible to a query that names one, and vice versa. Getting this wrong
 * produces an index that looks empty while holding everything.
 */
export const NAMESPACE_PARAM: Param = {
  key: "namespace",
  label: "Namespace",
  type: "string",
  default: "",
  placeholder: "customer-42",
  hint: "Empty is Pinecone's DEFAULT namespace — a real namespace, not a wildcard. Records " +
    "written to one namespace are invisible to queries against another.",
};

/** The metadata filter shared by query, delete and update. */
export const FILTER_PARAM: Param = {
  key: "filter",
  label: "Metadata Filter",
  type: "json",
  default: "",
  hint: 'MongoDB-style, e.g. `{"genre":{"$in":["comedy"]},"year":{"$eq":2019}}`. Operators: ' +
    "`$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$exists`, `$and`, `$or`.",
};
