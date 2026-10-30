import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import chargeUnskip from "../../actions/charge-unskip.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("charge-unskip: POSTs to /charges/{id}/unskip with an empty body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("charge", { id: 1, status: "queued" }) }]);
  const out = await chargeUnskip.execute({ chargeId: "1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/charges/1/unskip");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out, { id: 1, status: "queued" });
});
