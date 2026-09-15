import type { ActionDefinition } from "@w6w/types";
import { compact, MindeeClient } from "../lib/client.ts";

interface Input {
  name?: string;
  modelType?: "split" | "crop" | "classification" | "ocr" | "extraction";
  page?: number;
  perPage?: number;
}

/**
 * `GET /v2/search/models` — the models this API key's organization owns. This
 * is where a workflow gets the `modelId` every enqueue action needs; Mindee
 * has no separate "list models" route, only this search (all filters
 * optional — omit them all to list everything).
 */
const modelSearch: ActionDefinition<Input> = {
  key: "model-search",
  type: "search",
  resource: "model",
  title: "Search Models",
  description: "List models belonging to the API key's organization.",
  params: [
    {
      key: "name",
      label: "Name contains",
      type: "string",
      hint: "Case-insensitive partial match.",
    },
    {
      key: "modelType",
      label: "Model type",
      type: "select",
      options: [
        { value: "extraction", label: "Extraction" },
        { value: "classification", label: "Classification" },
        { value: "crop", label: "Crop" },
        { value: "ocr", label: "OCR" },
        { value: "split", label: "Split" },
      ],
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1, max: 100 },
    },
  ],
  output: [
    { key: "models", type: "array", label: "Models" },
    { key: "pagination", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new MindeeClient(ctx).json("/v2/search/models", {
      query: compact({
        name: input.name,
        model_type: input.modelType,
        page: input.page,
        per_page: input.perPage,
      }),
    });
  },
};

export default modelSearch;
