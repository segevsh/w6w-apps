import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/dashboard-list.ts";

const display = { endpoint: "https://example.grafana.net" };

Deno.test("dashboard-list: GETs /search with type=dash-db and forwards filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uid: "abc", title: "Prod" }] }], { display });
  const result = await action.execute(
    { query: "prod", tag: "team-a,critical", starred: true, limit: 10, page: 2 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/api/search");
  assertEquals(url.searchParams.get("type"), "dash-db");
  assertEquals(url.searchParams.get("query"), "prod");
  assertEquals(url.searchParams.get("tag"), "team-a,critical");
  assertEquals(url.searchParams.get("starred"), "true");
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(result, [{ uid: "abc", title: "Prod" }]);
});

Deno.test("dashboard-list: omits unset filters from the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display });
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("query"), false);
  assertEquals(url.searchParams.has("tag"), false);
  assertEquals(url.searchParams.has("folderUIDs"), false);
  assertEquals(url.searchParams.get("type"), "dash-db");
});
