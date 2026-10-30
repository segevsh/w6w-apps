import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/client-get-many.ts";

test("client-get-many: GETs /clients with name, status and pagination", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { data: [] } }]);
  await action.execute({ name: "bob", status: ["active", "archived"], page: 2, perPage: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/clients");
  assertEquals(url.searchParams.get("name"), "bob");
  assertEquals(url.searchParams.get("status"), "active,archived");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("per_page"), "10");
});

test("client-get-many: omits unset filters", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { data: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("name"), false);
  assertEquals(url.searchParams.has("status"), false);
});
