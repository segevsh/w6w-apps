import { assertEquals } from "@std/assert";
import watchDelete from "../../actions/watch-delete.ts";
import { mockCtx, obj, pathOf } from "../_helpers.ts";

Deno.test("watch-delete: DELETEs /watches/{id}; an empty body is fine", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await obj(await watchDelete.execute({ watchId: "w1" }, ctx));
  assertEquals([calls[0].method, pathOf(calls[0].url)], ["DELETE", "/v1/watches/w1"]);
  assertEquals(out, {});
});
