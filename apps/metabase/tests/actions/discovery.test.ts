import { assertEquals } from "@std/assert";
import databaseList from "../../actions/database-list.ts";
import databaseMetadata from "../../actions/database-metadata.ts";
import search from "../../actions/search.ts";
import { mockMetabaseCtx, SITE_URL } from "../_helpers.ts";

Deno.test("database-list: returns the {data,total} envelope and maps its params", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: { data: [{ id: 1, engine: "h2" }], total: 1 } }]);
  const r = await databaseList.execute({ include: "tables", savedQuestions: true }, ctx) as {
    data: unknown[];
  };
  assertEquals(r.data.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, SITE_URL, "the host comes from the connection, never a literal");
  assertEquals(url.pathname, "/api/database");
  assertEquals(url.searchParams.get("include"), "tables");
  assertEquals(url.searchParams.get("saved"), "true");
});

Deno.test("database-list: sends nothing when nothing is asked for", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: { data: [] } }]);
  await databaseList.execute({}, ctx);
  // `savedQuestions` has a declared default of false but is not sent unless the
  // caller supplies it — the endpoint's own default is already false.
  assertEquals(new URL(calls[0].url).searchParams.get("include"), null);
});

Deno.test("database-metadata: hits the metadata path and forwards skip_fields", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: { id: 1, tables: [] } }, { body: { id: 1 } }]);
  await databaseMetadata.execute({ databaseId: 1, skipFields: true }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/database/1/metadata");
  assertEquals(new URL(calls[0].url).searchParams.get("skip_fields"), "true");

  await databaseMetadata.execute({ databaseId: 1, skipFields: false }, ctx);
  // `false` is meaningful and must be sent, not dropped as a blank.
  assertEquals(new URL(calls[1].url).searchParams.get("skip_fields"), "false");
});

Deno.test("search: maps every filter onto Metabase's own param names", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: { data: [], total: 0 } }]);
  await search.execute({
    q: "revenue",
    models: ["card", "dashboard"],
    collection: 5,
    tableDbId: 2,
    archived: false,
    searchNativeQuery: true,
    filterItemsInPersonalCollection: "exclude",
    limit: 10,
    offset: 5,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/search");
  assertEquals(url.searchParams.get("q"), "revenue");
  assertEquals(url.searchParams.getAll("models"), ["card", "dashboard"]);
  assertEquals(url.searchParams.get("collection"), "5");
  assertEquals(url.searchParams.get("table_db_id"), "2");
  assertEquals(url.searchParams.get("archived"), "false");
  assertEquals(url.searchParams.get("search_native_query"), "true");
  assertEquals(url.searchParams.get("filter_items_in_personal_collection"), "exclude");
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(url.searchParams.get("offset"), "5");
});

/**
 * Comma-joining `models` is a 400 with
 * `received: "card,dashboard"` — verified on the wire. This is the check that
 * keeps multi-type search working at all.
 */
Deno.test("search: models is repeated, and the comma form never reaches the wire", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: { data: [] } }]);
  await search.execute({ q: "x", models: "card, dashboard" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("models"), ["card", "dashboard"]);
  assertEquals(url.searchParams.get("models"), "card");
  assertEquals(url.search.includes("%2C"), false);
});

/**
 * `q` is optional — verified live: `?models=dashboard&limit=3` returns 200 and
 * enumerates dashboards. That is what makes this the paginated lister the
 * type-specific endpoints do not provide.
 */
Deno.test("search: q is optional, so it doubles as a paginated lister", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: { data: [], total: 0 } }]);
  await search.execute({ models: ["dashboard"], limit: 3 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("q"), null);
  assertEquals(url.searchParams.getAll("models"), ["dashboard"]);
  assertEquals(search.params!.find((p) => p.key === "q")!.required, undefined);
});

Deno.test("search: its model enum is the search one, not the collection one", () => {
  const opts = search.params!.find((p) => p.key === "models")!.options as Array<{ value: string }>;
  const values = opts.map((o) => o.value);
  for (const v of ["database", "segment", "action", "indexed-entity"]) {
    assertEquals(values.includes(v), true, `search should offer ${v}`);
  }
  for (const v of ["pulse", "snippet", "timeline", "no_models"]) {
    assertEquals(values.includes(v), false, `search does not index ${v}`);
  }
});
