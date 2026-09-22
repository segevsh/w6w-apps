import { assertEquals } from "@std/assert";
import branchesList from "../../actions/branches-list.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("branches-list: reads GET /v2/branches and names the array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "Head Office" }] }]);
  const result = await branchesList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/branches");
  assertEquals(calls[0].method, "GET");
  assertEquals(bodyOf(calls[0]), {});
  assertEquals(result, { branches: [{ id: 1, name: "Head Office" }] });
});

/** The route documents no query parameter at all, so it sends none. */
Deno.test("branches-list: sends no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await branchesList.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(branchesList.params, []);
});
