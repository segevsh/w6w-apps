import { assertEquals } from "@std/assert";
import listsGet from "../../actions/lists-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lists-get: reads /v2/lists/{id} with NO trailing slash", async () => {
  const detail = { id: "lst_abcdef", createdAt: 1620687647, status: "Ready" };
  const { ctx, calls } = mockCtx([{ body: detail }]);
  const out = await listsGet.execute({ id: "lst_abcdef" }, ctx) as { list: unknown };

  assertEquals(pathOf(calls[0].url), "/v2/lists/lst_abcdef");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.list, detail);
});

Deno.test("lists-get: id is required and path-escaped", async () => {
  const idParam = listsGet.params?.find((p) => p.key === "id");
  assertEquals(idParam?.required, true);

  const { ctx, calls } = mockCtx([{ body: {} }]);
  await listsGet.execute({ id: "lst/weird id" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/lists/lst%2Fweird%20id");
});
