import type { Param } from "@w6w/types";

/**
 * The dataset an action works on.
 *
 * Optional because the Connection records one, and overridable because a
 * project routinely has `production` beside `development` and a workflow may
 * legitimately touch both.
 */
export const DATASET_PARAM: Param = {
  key: "dataset",
  label: "Dataset",
  type: "string",
  default: "",
  advanced: true,
  hint: "Defaults to the connection's dataset.",
};

/**
 * Everything a mutation request can be told, beyond the mutations themselves.
 *
 * `dryRun` is first among them for a reason: Sanity validates and reports what
 * *would* happen without applying it, which is a rare and genuinely useful
 * thing to have on a destructive call.
 */
export const MUTATION_OPTION_PARAMS: Param[] = [
  {
    key: "dryRun",
    label: "Dry Run",
    type: "boolean",
    default: false,
    hint: "Validate without applying. Sanity supports this natively — worth using before any " +
      "query-based change.",
  },
  {
    key: "returnDocuments",
    label: "Return Documents",
    type: "boolean",
    default: false,
    advanced: true,
    hint: "Return the full changed documents rather than just their ids. Off by default because " +
      "a large batch makes a large response.",
  },
  {
    key: "visibility",
    label: "Visibility",
    type: "select",
    default: "sync",
    advanced: true,
    options: [
      { value: "sync", label: "sync — the next query sees the change" },
      { value: "async", label: "async — committed, visible in about a second" },
      { value: "deferred", label: "deferred — fastest, bypasses indexing entirely" },
    ],
    hint: "`sync` is Sanity's default and the safe one for a workflow whose next step reads " +
      "what it just wrote. `deferred` is for bulk imports where nothing reads for a while.",
  },
  {
    key: "transactionId",
    label: "Transaction ID",
    type: "string",
    default: "",
    advanced: true,
    hint: "Your own id for this transaction; it must be unique in the dataset. Makes a write " +
      "findable in the history API afterwards.",
  },
];

/**
 * The revision lock available on patch and delete.
 *
 * Optional in Sanity — unlike, say, Gusto, where the equivalent is required —
 * so a workflow opts into safety rather than being handed it. Worth opting in
 * whenever anything else might be editing the same document.
 */
export const REVISION_PARAM: Param = {
  key: "ifRevisionId",
  label: "If Revision ID",
  type: "string",
  default: "",
  advanced: true,
  hint: "Optimistic lock: the write fails if the document has changed since this revision " +
    "(`_rev`). Optional in Sanity — set it when something else might be editing the same " +
    "document.",
};
