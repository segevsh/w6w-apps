import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/candidate-get.ts";
import { mockCtx } from "../_helpers.ts";

const input = { companyId: "c1", positionId: "p1", candidateId: "k1" };

Deno.test("candidate-get: GETs the candidate through its position", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "k1", name: "Bo" } }]);
  assertEquals(await action.execute!(input, ctx), { _id: "k1", name: "Bo" });
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/position/p1/candidate/k1");
});

Deno.test("candidate-get: 412 (not on this position) is surfaced", async () => {
  const { ctx } = mockCtx([{
    status: 412,
    body: { error: { type: "wrongPosition", message: "m" } },
  }]);
  await assertRejects(
    async () => await action.execute!(input, ctx),
    Error,
    "HTTP 412 — wrongPosition: m",
  );
});
