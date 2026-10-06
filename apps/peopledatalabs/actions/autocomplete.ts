import type { ActionDefinition } from "@w6w/types";
import { PdlClient, pick } from "../lib/client.ts";
import { titlecaseParam } from "../lib/params.ts";

type Input = Record<string, unknown>;

export const AUTOCOMPLETE_FIELDS = [
  "all_location",
  "class",
  "company",
  "country",
  "industry",
  "location_name",
  "major",
  "region",
  "role",
  "school",
  "skill",
  "sub_role",
  "title",
  "website",
] as const;

const autocomplete: ActionDefinition<Input> = {
  key: "autocomplete",
  type: "search",
  resource: "autocomplete",
  title: "Autocomplete Field Values",
  description:
    "Suggest valid values (with record counts) for a person-schema field from a prefix, e.g. company names starting `tes`. Use it to build Search People queries that hit canonical values. Free for every active key; counts against a daily rate limit.",
  params: [
    {
      key: "field",
      label: "Field",
      type: "select",
      required: true,
      options: AUTOCOMPLETE_FIELDS.map((v) => ({ label: v, value: v })),
      hint: "Which field to suggest values for.",
    },
    {
      key: "text",
      label: "Starting text",
      type: "string",
      hint: "Prefix to complete. Empty returns the most common values.",
    },
    {
      key: "size",
      label: "Max suggestions",
      type: "number",
      default: 10,
      validation: { min: 1, max: 100, integer: true },
    },
    titlecaseParam,
  ],
  output: [
    { key: "status", type: "number", label: "PDL status" },
    { key: "data", type: "array", label: "Suggestions: { name, count, meta? }" },
  ],

  async execute(input, ctx) {
    if (typeof input.field !== "string" || input.field === "") {
      throw new Error("field is required.");
    }
    return await new PdlClient(ctx).request("GET", "/v5/autocomplete", {
      query: pick(input, ["field", "text", "size", "titlecase"]),
    });
  },
};

export default autocomplete;
