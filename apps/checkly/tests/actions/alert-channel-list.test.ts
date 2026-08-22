import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/alert-channel-list.ts";

Deno.test("alert-channel-list: reads the bare-array collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "x1" }] }]);
  assertEquals(await action.execute!({}, ctx), [{ id: "x1" }]);
  assertEquals(new URL(calls[0].url).pathname, "/v1/alert-channels");
});

Deno.test("alert-channel-list: returnAll walks pages until a short one", async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ id: `x${i}` }));
  const { ctx, calls } = mockCtx([
    { status: 200, body: full },
    { status: 200, body: [{ id: "last" }] },
  ]);
  assertEquals((await action.execute!({ returnAll: true }, ctx) as unknown[]).length, 101);
  assertEquals(new URL(calls[1].url).searchParams.get("page"), "2");
});
