import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-custom-audience.ts";

Deno.test("delete-custom-audience: DELETE /<id>; surfaces the lookalike-exists error", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true } },
    { status: 400, body: { error: { message: "associated lookalikes exist", code: 2656 } } },
  ]);
  assertEquals(await action.execute({ audienceId: "900" }, ctx), { success: true });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v25.0/900");
  await assertRejects(
    () => Promise.resolve(action.execute({ audienceId: "900" }, ctx)),
    Error,
    "lookalikes exist",
  );
});
