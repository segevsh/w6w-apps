import { assertEquals } from "@std/assert";
import watchList from "../../actions/watch-list.ts";
import { envelope, mockCtx, obj, pathOf, queryOf } from "../_helpers.ts";

Deno.test("watch-list: GETs /watches with an optional status filter", async () => {
  const a = mockCtx([{ body: envelope([{ id: "w1" }]) }]);
  const out = await obj(await watchList.execute({ status: "active" }, a.ctx));
  assertEquals(pathOf(a.calls[0].url), "/v1/watches");
  assertEquals(queryOf(a.calls[0].url), { status: "active" });
  assertEquals(out.items, [{ id: "w1" }]);
  const b = mockCtx([{ body: envelope([]) }]);
  await watchList.execute({}, b.ctx);
  assertEquals(queryOf(b.calls[0].url), {});
});
