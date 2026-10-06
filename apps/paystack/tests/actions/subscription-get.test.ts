import { assertEquals } from "@std/assert";
import action from "../../actions/subscription-get.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("subscription-get: GETs /subscription/{code}", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ subscription_code: "SUB_1", status: "active" }) }]);
  assertEquals(await action.execute({ id: "SUB_1" }, ctx), {
    subscription_code: "SUB_1",
    status: "active",
  });
  assertEquals(pathOf(calls[0].url), "/subscription/SUB_1");
});
