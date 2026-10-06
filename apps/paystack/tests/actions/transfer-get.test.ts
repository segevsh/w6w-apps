import { assertEquals } from "@std/assert";
import action from "../../actions/transfer-get.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("transfer-get: GETs /transfer/{code}", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ transfer_code: "TRF_1", status: "pending" }) }]);
  assertEquals(await action.execute({ id: "TRF_1" }, ctx), {
    transfer_code: "TRF_1",
    status: "pending",
  });
  assertEquals(pathOf(calls[0].url), "/transfer/TRF_1");
});
