import { assertEquals } from "@std/assert";
import collectionList from "../../actions/collection-list.ts";
import collectionItems from "../../actions/collection-items.ts";
import collectionCreate from "../../actions/collection-create.ts";
import { mockMetabaseCtx, SITE_URL } from "../_helpers.ts";

Deno.test("collection-list: sends Metabase's kebab-case query params", async () => {
  // The endpoint spells these `personal-only` and
  // `exclude-other-user-collections`, not snake_case like most of the API.
  const { ctx, calls } = mockMetabaseCtx([{ body: [] }]);
  await collectionList.execute({
    archived: false,
    personalOnly: false,
    excludeOtherUserCollections: true,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/collection");
  assertEquals(url.searchParams.get("archived"), "false");
  assertEquals(url.searchParams.get("personal-only"), "false");
  assertEquals(url.searchParams.get("exclude-other-user-collections"), "true");
});

/**
 * `root` is a real, working collection id and it is a string. Typing this param
 * as a number would make the top level of every instance unreachable.
 */
Deno.test("collection-items: `root` is a valid id and reaches the top level", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: { data: [], total: 0 } }]);
  await collectionItems.execute({ collectionId: "root" }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/api/collection/root/items`);
  assertEquals(collectionItems.params!.find((p) => p.key === "collectionId")!.type, "string");
  assertEquals(collectionItems.params!.find((p) => p.key === "collectionId")!.default, "root");
});

Deno.test("collection-items: a numeric id works too", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: { data: [] } }]);
  await collectionItems.execute({ collectionId: "5" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/collection/5/items");
});

/**
 * `models` REPEATS. Comma-joining is a hard 400, verified on the wire.
 */
Deno.test("collection-items: models is repeated, never comma-joined", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: { data: [] } }]);
  await collectionItems.execute({
    collectionId: "root",
    models: ["card", "dashboard"],
    limit: 10,
    offset: 20,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("models"), ["card", "dashboard"]);
  assertEquals(url.search.includes("%2C"), false);
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(url.searchParams.get("offset"), "20");
});

Deno.test("collection-items: a single selection arriving as a string still repeats correctly", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: { data: [] } }]);
  await collectionItems.execute({ collectionId: "root", models: "dashboard" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.getAll("models"), ["dashboard"]);
});

Deno.test("collection-items: its model enum is the collection one, not search's", () => {
  const opts = collectionItems.params!.find((p) => p.key === "models")!.options as Array<
    { value: string }
  >;
  const values = opts.map((o) => o.value);
  // Present in collections, absent from search.
  for (const v of ["pulse", "snippet", "timeline", "no_models"]) {
    assertEquals(values.includes(v), true, `collection items should offer ${v}`);
  }
  // Present in search, impossible inside a collection.
  for (const v of ["database", "segment", "action", "indexed-entity"]) {
    assertEquals(values.includes(v), false, `a collection cannot contain a ${v}`);
  }
});

Deno.test("collection-create: only name is required and parentId is omitted for the root", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: { id: 5 } }]);
  await collectionCreate.execute({ name: "Reports" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${SITE_URL}/api/collection`);
  assertEquals(JSON.parse(calls[0].body!), { name: "Reports" });
});

Deno.test("collection-create: nests under a parent when one is given", async () => {
  const { ctx, calls } = mockMetabaseCtx([{ body: {} }]);
  await collectionCreate.execute({ name: "Q3", parentId: 5, description: "quarterly" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Q3",
    parent_id: 5,
    description: "quarterly",
  });
});

Deno.test("collection-create: is declared non-idempotent", () => {
  assertEquals(collectionCreate.idempotent, false);
});
