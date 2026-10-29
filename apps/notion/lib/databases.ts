import { NotionClient, type NotionListResponse, pathId } from "./client.ts";

/** The name of a data source's title column — every data source has exactly one. */
export async function titlePropertyName(
  client: NotionClient,
  dataSourceId: string,
): Promise<string> {
  const source = await client.request<{ properties?: Record<string, { type?: string }> }>(
    `/data_sources/${pathId(dataSourceId)}`,
  );
  const name = Object.entries(source.properties ?? {}).find(([, p]) => p.type === "title")?.[0];
  if (!name) {
    throw new Error(
      "This data source has no title property, so Title cannot be set. Use Properties.",
    );
  }
  return name;
}

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
