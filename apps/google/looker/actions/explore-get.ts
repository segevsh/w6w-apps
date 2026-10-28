import type { ActionDefinition } from "@w6w/types";
import { LookerClient } from "../lib/client.ts";

/**
 * `GET /api/4.0/lookml_models/{model}/explores/{explore}` — every field a
 * query may reference.
 *
 * ## This is the contract `query-run` has to satisfy
 *
 * Field names must be `view_name.field_name`, and the valid ones are exactly
 * what this returns. Guessing them produces a 422 whose message names the
 * field, which reads as though the field is missing rather than as though the
 * name is wrong.
 *
 * ## Dimensions and measures are not interchangeable
 *
 * A **dimension** is an attribute — a column, a date, a category. A **measure**
 * is an aggregate — a count, a sum, an average. Selecting only measures gives
 * one row; selecting a dimension groups by it. A query that returns a single
 * unexpected row has usually selected no dimension, and nothing says so.
 *
 * ## `hidden` fields are still queryable
 *
 * Hidden means hidden from the interface's field picker. The API will happily
 * select them, which is occasionally what you want and occasionally means
 * depending on something the LookML author considered internal.
 *
 * ## Some fields cannot be filtered or sorted
 *
 * `can_filter` and `can_time_filter` are per field. A workflow filtering on a
 * table calculation or a certain measure gets a rejection about the filter
 * rather than about the field's capability.
 */
const action: ActionDefinition = {
  key: "explore-get",
  type: "read",
  resource: "explore",
  title: "Describe an Explore",
  description:
    "Every field an Explore exposes, split into DIMENSIONS and MEASURES — selecting only " +
    "measures returns one row and selecting a dimension groups by it, which is the commonest " +
    "surprise in a Looker query. Hidden fields are listed, because the API can still select them.",
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "explore",
      label: "Explore",
      type: "string",
      required: true,
      default: "",
      hint: "The Explore name from `model-list` — not a LookML view name.",
    },
    {
      key: "includeHidden",
      label: "Include hidden fields",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "label", type: "string", label: "What the Explore is called" },
    { key: "dimensions", type: "array", label: "Attributes — selecting one groups by it" },
    { key: "measures", type: "array", label: "Aggregates — selecting only these gives one row" },
    { key: "dimensionCount", type: "number", label: "How many" },
    { key: "measureCount", type: "number", label: "How many" },
    { key: "unfilterable", type: "array", label: "Fields that cannot appear in a filter" },
    { key: "connectionName", type: "string", label: "Which database this queries" },
    { key: "hiddenCount", type: "number", label: "Hidden in the UI, still queryable here" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const model = String(p.model ?? "").trim();
    const explore = String(p.explore ?? "").trim();
    if (!model) throw new Error("`model` is required");
    if (!explore) throw new Error("`explore` is required");

    const body = await new LookerClient(ctx).request<{
      label?: string;
      connection_name?: string;
      fields?: {
        dimensions?: Array<
          { name?: string; label?: string; type?: string; hidden?: boolean; can_filter?: boolean }
        >;
        measures?: Array<
          { name?: string; label?: string; type?: string; hidden?: boolean; can_filter?: boolean }
        >;
      };
    }>(
      `/lookml_models/${encodeURIComponent(model)}/explores/${encodeURIComponent(explore)}`,
    );

    const includeHidden = p.includeHidden === true;
    const keep = <T extends { hidden?: boolean }>(fields: T[] | undefined) =>
      (fields ?? []).filter((field) => includeHidden || field?.hidden !== true);

    const dimensions = keep(body?.fields?.dimensions);
    const measures = keep(body?.fields?.measures);
    const allFields = [...(body?.fields?.dimensions ?? []), ...(body?.fields?.measures ?? [])];

    return {
      label: body?.label,
      dimensions: dimensions.map((field) => ({
        name: field?.name,
        label: field?.label,
        type: field?.type,
        canFilter: field?.can_filter !== false,
      })),
      measures: measures.map((field) => ({
        name: field?.name,
        label: field?.label,
        type: field?.type,
        canFilter: field?.can_filter !== false,
      })),
      dimensionCount: dimensions.length,
      measureCount: measures.length,
      // A filter on one of these is rejected in terms of the filter rather
      // than the field's capability.
      unfilterable: allFields
        .filter((field) => field?.can_filter === false)
        .map((field) => field?.name)
        .filter(Boolean),
      connectionName: body?.connection_name,
      hiddenCount: allFields.filter((field) => field?.hidden === true).length,
    };
  },
};

export default action;
