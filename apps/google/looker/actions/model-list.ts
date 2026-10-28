import type { ActionDefinition } from "@w6w/types";
import { LookerClient, query } from "../lib/client.ts";

/**
 * `GET /api/4.0/lookml_models` — the models, and the Explores inside them.
 *
 * ## This is the vocabulary a query has to speak
 *
 * `query-run` needs a model and an Explore, and neither is guessable: they are
 * named by whoever wrote the LookML. This is where those names come from, and
 * it is the first call a workflow that queries should make.
 *
 * ## An Explore's name is what the API calls a `view`
 *
 * The `explores` array here gives the names to pass as `explore` — and Looker's
 * query API calls that field `view`. The names in this response are the correct
 * ones; the LookML views underneath them are not.
 *
 * ## A model with no connection is a model nothing can run
 *
 * `allowed_db_connection_names` says which database connections a model may
 * use. A model listed here with none is defined and unusable, which is a
 * configuration state rather than an error and produces a failure only at query
 * time.
 */
const action: ActionDefinition = {
  key: "model-list",
  type: "search",
  resource: "model",
  title: "List LookML models",
  description:
    "The LookML models and their EXPLORES — the vocabulary `query-run` needs, and neither name " +
    "is guessable. The Explore names here are what the query API calls `view`; the LookML views " +
    "underneath are not.",
  params: [
    {
      key: "excludeEmpty",
      label: "Exclude models with no Explores",
      type: "boolean",
      default: true,
      hint: "A model with no Explores has nothing a query could reference.",
    },
    {
      key: "excludeHidden",
      label: "Exclude hidden Explores",
      type: "boolean",
      default: false,
      hint: "Hidden Explores are hidden from the interface and remain queryable through the API.",
    },
  ],
  output: [
    { key: "models", type: "array", label: "The models" },
    { key: "count", type: "number", label: "How many" },
    { key: "names", type: "array", label: "Just the model names" },
    { key: "explores", type: "array", label: "Every `model/explore` pair, ready for a query" },
    { key: "exploreCount", type: "number", label: "How many Explores in total" },
    { key: "modelsWithoutConnection", type: "array", label: "Defined, and unable to run anything" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    const all = await new LookerClient(ctx).request<
      Array<{
        name?: string;
        label?: string;
        project_name?: string;
        allowed_db_connection_names?: string[];
        explores?: Array<{ name?: string; label?: string; hidden?: boolean }>;
      }>
    >("/lookml_models", {
      query: query({
        exclude_empty: p.excludeEmpty !== false,
        exclude_hidden: p.excludeHidden === true,
      }),
    });

    const models = Array.isArray(all) ? all : [];
    // `model/explore` is the pair a query needs, so it is built here rather
    // than left to the caller to assemble.
    const explores: string[] = [];
    for (const model of models) {
      for (const explore of model?.explores ?? []) {
        if (model?.name && explore?.name) explores.push(`${model.name}/${explore.name}`);
      }
    }

    // Defined and unable to run anything — a configuration state, not an error.
    const modelsWithoutConnection = models
      .filter((model) => !(model?.allowed_db_connection_names ?? []).length)
      .map((model) => model?.name)
      .filter(Boolean) as string[];

    return {
      models,
      count: models.length,
      names: models.map((model) => model?.name).filter(Boolean),
      explores,
      exploreCount: explores.length,
      modelsWithoutConnection,
    };
  },
};

export default action;
