import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/transaction-get.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("transaction-get: GETs /transaction/{id} and returns data", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ id: 4099260516, status: "success" }) }]);
  assertEquals(await action.execute({ id: "4099260516" }, ctx), {
    id: 4099260516,
    status: "success",
  });
  assertEquals(pathOf(calls[0].url), "/transaction/4099260516");
});

Deno.test("transaction-get: requires an id", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ id: "  " }, ctx),
    Error,
    "Transaction id is required",
  );
});
