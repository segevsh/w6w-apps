import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/candidate-scorecard-add.ts";
import { mockCtx } from "../_helpers.ts";

const base = { companyId: "c1", positionId: "p1", candidateId: "k1", score: "good" };

Deno.test("candidate-scorecard-add: PUTs score and note, empty 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ ...base, note: "solid" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.breezy.hr/v3/company/c1/position/p1/candidate/k1/scorecard",
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { score: "good", note: "solid" });
  assertEquals(out, { ok: true, score: "good" });
});

Deno.test("candidate-scorecard-add: 412 (candidate moved) is an error", async () => {
  const { ctx } = mockCtx([{ status: 412, body: { error: { type: "moved", message: "m" } } }]);
  await assertRejects(async () => await action.execute!(base, ctx), Error, "HTTP 412");
});
