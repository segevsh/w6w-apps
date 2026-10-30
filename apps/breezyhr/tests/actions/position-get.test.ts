import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import action from "../../actions/position-get.ts";
import { mockCtx } from "../_helpers.ts";

test("position-get: GETs the position", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "p1", name: "Dev" } }]);
  const out = await action.execute!({ companyId: "c1", positionId: "p1" }, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/position/p1");
  assertEquals(out, { _id: "p1", name: "Dev" });
});

test("position-get: 404 reports the error type", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: { type: "notFound", message: "nope" } },
  }]);
  await assertRejects(
    async () => await action.execute!({ companyId: "c1", positionId: "x" }, ctx),
    Error,
    "notFound: nope",
  );
});
