import type { ActionDefinition } from "@w6w/types";
import { asJson, asOptionalJson, compact, MetabaseClient } from "../lib/client.ts";
import { cardOutput } from "../lib/params.ts";

/**
 * `POST /api/card` — save a question.
 *
 * ## The four required fields are required, and one of them is a surprise
 *
 * Metabase's OpenAPI document marks exactly four members required:
 *
 *     "required": ["name", "dataset_query", "display", "visualization_settings"]
 *
 * `name`, `dataset_query` and `display` are all obvious. **`visualization_settings`
 * is not** — it is a display-configuration blob that most callers have no
 * opinion about, and omitting it is a 400 rather than a default. This action
 * therefore sends `{}` when the caller supplies nothing, which is what
 * Metabase's own UI sends for a plain table. Verified live: a question created
 * with `visualization_settings: {}` came back with id 40 and rendered normally.
 *
 * `display` is the visualisation type — `table`, `bar`, `line`, `scalar`, `pie`
 * and so on. The endpoint's schema types it as a free `string` rather than an
 * enum (the legal set is extensible, and plugins can add to it), so no options
 * list is offered here: enumerating it would mean inventing a closed vocabulary
 * the vendor deliberately left open. `table` is the default because it is the
 * one display that works for any result shape.
 *
 * ## `collectionId` and the root collection
 *
 * Omitting `collection_id` puts the question in the root collection. That is
 * Metabase's own rule, and it is why this param is optional and unset rather
 * than defaulted to some sentinel.
 *
 * ## Idempotency
 *
 * `idempotent: false`, stated rather than assumed. Metabase allocates a fresh
 * id on every call and does nothing to deduplicate by name — running this twice
 * produces two questions with the same title, which is exactly the surprise a
 * retrying workflow needs to be warned about.
 */
interface Input {
  name: string;
  datasetQuery: unknown;
  display?: string;
  description?: string;
  collectionId?: number;
  visualizationSettings?: unknown;
  type?: string;
}

const questionCreate: ActionDefinition<Input> = {
  key: "question-create",
  type: "perform",
  resource: "question",
  title: "Create Question",
  description: "Save a new question from a query definition.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "datasetQuery",
      label: "Query",
      type: "json",
      required: true,
      hint: 'The full query object: `{"database": 1, "type": "native", ' +
        '"native": {"query": "SELECT 1"}}`. Copy `dataset_query` off an existing question with ' +
        "Get Question to get the shape right.",
    },
    {
      key: "display",
      label: "Visualisation",
      type: "string",
      required: true,
      default: "table",
      hint: "`table`, `bar`, `line`, `area`, `scalar`, `pie`, `row`, `map`, `scatter`, `funnel`, " +
        "`gauge`, `progress`, `pivot`. Metabase types this as an open string, so the list is a " +
        "guide rather than a closed set.",
    },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    {
      key: "collectionId",
      label: "Collection ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Leave empty to save into the root collection.",
    },
    {
      key: "type",
      label: "Entity type",
      type: "select",
      default: "question",
      options: [
        { value: "question", label: "Question" },
        { value: "model", label: "Model", description: "A reusable, curated starting table." },
        { value: "metric", label: "Metric", description: "A reusable aggregation." },
      ],
    },
    {
      key: "visualizationSettings",
      label: "Visualisation settings",
      type: "json",
      hint: "Display configuration. Required by the API — an empty object is sent for you if you " +
        "leave this blank.",
    },
  ],
  output: cardOutput,

  execute(input, ctx) {
    return new MetabaseClient(ctx).request("/api/card", {
      method: "POST",
      body: {
        name: input.name,
        dataset_query: asJson<Record<string, unknown>>(input.datasetQuery, "Query"),
        display: input.display ?? "table",
        // Required by the endpoint, and almost never something a caller has an
        // opinion about. `{}` is what Metabase's own UI sends for a plain table.
        visualization_settings: asOptionalJson<Record<string, unknown>>(
          input.visualizationSettings,
          "Visualisation settings",
        ) ?? {},
        ...compact({
          description: input.description,
          collection_id: input.collectionId,
          type: input.type,
        }),
      },
    });
  },
};

export default questionCreate;
