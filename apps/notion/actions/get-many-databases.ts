import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";
import { searchDatabaseContainers } from "../lib/databases.ts";
interface Input {
  limit?: number;
}
const action: ActionDefinition<Input, { results: unknown[] }> = {
  key: "get-many-databases",
  type: "read",
  resource: "database",
  title: "Get Many Databases",
  description:
    "Walk data source search and retrieve unique database containers. Search indexing is not exhaustive.",
  params: [{
    key: "limit",
    label: "Limit",
    type: "number",
    validation: { integer: true, min: 1 },
    hint: "Maximum unique databases to return. Omit to walk all search results.",
  }],
  output: [{ key: "results", type: "array", label: "Databases" }],
  async execute(input, ctx) {
    if (input.limit !== undefined && (!Number.isInteger(input.limit) || input.limit < 1)) {
      throw new Error("Limit must be a positive integer.");
    }
    const client = new NotionClient(ctx);
    const results: unknown[] = [];
    const seen = new Set<string>();
    const cursors = new Set<string>();
    let startCursor: string | undefined;
    do {
      const page = await searchDatabaseContainers(client, {
        page_size: input.limit ? Math.min(input.limit - results.length, 100) : 100,
        start_cursor: startCursor,
      }, seen);
      results.push(...page.results);
      if (input.limit && results.length >= input.limit) {
        return { results: results.slice(0, input.limit) };
      }
      if (!page.has_more || !page.next_cursor) break;
      if (cursors.has(page.next_cursor)) {
        throw new Error("Notion returned a repeated search cursor.");
      }
      startCursor = page.next_cursor;
      cursors.add(startCursor);
    } while (startCursor);
    return { results };
  },
};
export default action;
