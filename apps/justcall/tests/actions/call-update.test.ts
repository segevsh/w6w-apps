import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import callUpdate from "../../actions/call-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("call-update: PUTs to /v2.1/calls/{id} with only the set fields", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 1 }) }]);
  await callUpdate.execute({ id: 1, notes: "called back" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2.1/calls/1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { notes: "called back" });
});

test("call-update: is declared idempotent — the vendor documents a full replace", () => {
  assertEquals(callUpdate.idempotent, true);
});
