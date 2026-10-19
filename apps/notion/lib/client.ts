import type { HookContext } from "@w6w/types";

export const API_URL = "https://api.notion.com/v1";
export const NOTION_VERSION = "2026-03-11";
export const ADMIN_VERSION = "2026-06-01";

export interface NotionListResponse<T = unknown> {
  object: "list";
  results: T[];
  next_cursor: string | null;
  has_more: boolean;
  type?: string;
}

export type QueryValue = string | number | boolean | readonly string[] | undefined | null;
export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  form?: FormData;
  admin?: boolean;
  version?: string;
  accept?: "application/json" | "text/event-stream";
}

/** Encode a path segment, including property IDs that Notion already URL-encodes. */
export function pathId(value: string): string {
  if (!value?.trim()) throw new Error("A Notion resource ID is required.");
  try {
    return encodeURIComponent(decodeURIComponent(value));
  } catch {
    return encodeURIComponent(value);
  }
}

export class NotionError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryAfter: string | null,
  ) {
    super(message);
    this.name = "NotionError";
  }
}

/** All requests go through the host; credentials are injected only by auth sign hooks. */
export class NotionClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const auth = this.ctx.connection?.auth;
    if (auth && options.admin && auth !== "organization-token") {
      throw new Error("Admin actions require an Organization Bot Token connection.");
    }
    if (auth && path.startsWith("/oauth/") && auth !== "oauth-client") {
      throw new Error("Token management actions require an OAuth Client connection.");
    }
    if (auth === "internal-secret" && path === "/pages" && options.method === "POST") {
      const parent = (options.body as { parent?: { workspace?: boolean } })?.parent;
      if (!parent || parent.workspace) {
        throw new Error(
          "Internal integrations require a parent page or data source shared with the integration. Choose Existing page and paste its Notion link, or use OAuth / Personal Access Token for a private workspace page.",
        );
      }
    }
    const base = options.admin ? "https://api.notion.com/admin/v1" : API_URL;
    const url = new URL(`${base}${path}`);
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value === undefined || value === null || value === "") continue;
        for (const item of Array.isArray(value) ? value : [value]) {
          url.searchParams.append(key, String(item));
        }
      }
    }
    const headers: Record<string, string> = {
      "Notion-Version": options.version ?? (options.admin ? ADMIN_VERSION : NOTION_VERSION),
      accept: options.accept ?? "application/json",
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.form) {
      init.body = options.form;
    } else if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    const res = await this.ctx.fetch(url.toString(), init);
    if (!res.ok) {
      const detail = await res.text();
      throw new NotionError(
        `Notion ${res.status} ${res.statusText} for ${init.method} ${url.pathname}: ${detail}`,
        res.status,
        res.headers.get("retry-after"),
      );
    }
    if (res.status === 204) return undefined as T;
    if (options.accept === "text/event-stream") {
      // Workflow actions return a completed value; retain SSE frames and replay IDs verbatim.
      return { eventStream: await res.text() } as T;
    }
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
}

/** Old database-ID inputs are unambiguous only when the container has one data source. */
export async function resolveDataSource(
  client: NotionClient,
  input: { databaseId?: string; dataSourceId?: string },
): Promise<string> {
  if (input.dataSourceId) return input.dataSourceId;
  if (!input.databaseId) throw new Error("Provide a Data Source ID or Database ID.");
  const database = await client.request<{ data_sources: { id: string }[] }>(
    `/databases/${pathId(input.databaseId)}`,
  );
  if (database.data_sources?.length !== 1) {
    throw new Error(
      "This database does not have exactly one data source. Use Get Database to find its data_sources, then provide a Data Source ID.",
    );
  }
  return database.data_sources[0].id;
}
