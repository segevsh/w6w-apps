import type { ActionDefinition } from "@w6w/types";
import { FindymailClient } from "../lib/client.ts";

interface Input {
  q: string;
}

const searchTechnologies: ActionDefinition<Input> = {
  key: "search-technologies",
  type: "search",
  resource: "technology",
  title: "Search Technologies",
  description:
    "Search Findymail's technology catalog by name (min 2 characters, up to 25 results). Free, rate-limited to 10 requests per minute.",
  params: [{
    "key": "q",
    "label": "Search term",
    "type": "string",
    "required": true,
    "hint": "At least 2 characters.",
  }],
  output: [{
    "key": "data",
    "type": "array",
    "label": "Technologies (name, category, subcategory)",
  }],

  async execute(input, ctx) {
    return await new FindymailClient(ctx).request("GET", "/api/technologies/search", {
      query: { q: input.q },
    });
  },
};

export default searchTechnologies;
