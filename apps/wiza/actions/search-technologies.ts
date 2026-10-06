import type { ActionDefinition } from "@w6w/types";
import { WizaClient } from "../lib/client.ts";

interface Input {
  query: string;
}

const searchTechnologies: ActionDefinition<Input> = {
  key: "search-technologies",
  type: "search",
  resource: "technology",
  title: "Search Technologies",
  description:
    "Resolve a technology name or slug prefix (3+ characters) to the slugs the prospect and company search `technologies` filter accepts (GET /api/meta/technology_autocomplete).",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      hint: "At least 3 characters, not blank.",
      placeholder: "sales",
      validation: { minLength: 3 },
    },
  ],
  output: [{ key: "technologies", type: "array", label: "{ slug, name } per match" }],

  async execute(input, ctx) {
    const query = String(input.query ?? "").trim();
    if (query.length < 3) throw new Error("query must be at least 3 characters");
    const body = await new WizaClient(ctx).call("/api/meta/technology_autocomplete", {
      query: { query },
    });
    return { technologies: Array.isArray(body.data) ? body.data : [] };
  },
};

export default searchTechnologies;
