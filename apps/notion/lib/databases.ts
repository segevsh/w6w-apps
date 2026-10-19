import { NotionClient, type NotionListResponse, pathId } from "./client.ts";

interface DataSourceResult {
  parent?: { database_id?: string };
}
/** Search now returns data sources. Resolve their containers to preserve database action outputs. */
export async function searchDatabaseContainers(
  client: NotionClient,
  body: Record<string, unknown>,
  seen = new Set<string>(),
): Promise<NotionListResponse> {
  const page = await client.request<NotionListResponse<DataSourceResult>>("/search", {
    method: "POST",
    body: { ...body, filter: { property: "object", value: "data_source" } },
  });
  const results: unknown[] = [];
  for (const source of page.results) {
    const id = source.parent?.database_id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    results.push(await client.request(`/databases/${pathId(id)}`));
  }
  return { ...page, results };
}
