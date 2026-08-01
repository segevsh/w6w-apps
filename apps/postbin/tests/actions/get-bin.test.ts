import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-bin.ts";

Deno.test("get-bin: GETs /api/bin/:binId", async () => {
  const { ctx, calls } = mockCtx([
    { body: { binId: "YS4il4gS", now: 1439113980530, expires: 1439115780530 } },
  ]);
  const out = await action.execute({ binId: "YS4il4gS" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://www.postb.in/api/bin/YS4il4gS");
  assertEquals(out.binId, "YS4il4gS");
  assertEquals(out.expires, 1439115780530);
});

Deno.test("get-bin: throws with the vendor's message on a 404", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { msg: "No such bin" } }]);
  await assertRejects(async () => {
    await action.execute({ binId: "gone" }, ctx);
  });
});
