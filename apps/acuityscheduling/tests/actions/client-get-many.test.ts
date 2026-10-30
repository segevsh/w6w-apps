import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/client-get-many.ts";

test("client-get-many: GETs /clients with a search filter", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ firstName: "Bob" }] }]);
  const result = await action.execute({ search: "Bob" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/clients");
  assertEquals(url.searchParams.get("search"), "Bob");
  assertEquals(result, [{ firstName: "Bob" }]);
});

test("client-get-many: omits search when not supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("search"), false);
});
