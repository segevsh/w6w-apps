import { assertEquals, assertRejects } from "@std/assert";
import insightGet from "../../actions/insight-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const base = {
  funnelId: "f1",
  insightId: "question_1234",
  from: "2025-01-01T00:00:00.000Z",
  to: "2025-01-31T00:00:00.000Z",
};

Deno.test("insight-get: GET /metrics/insights/{id} returns title and answers", async () => {
  const insight = { title: "Goal?", answers: { A: 3 }, groupedAnswers: { "A; B": 2 } };
  const { ctx, calls } = mockCtx([{ body: envelope(insight) }]);
  const out = await insightGet.execute(base, ctx) as { data: typeof insight };
  assertEquals(pathOf(calls[0].url), "/v1/funnels/f1/metrics/insights/question_1234");
  assertEquals(queryOf(calls[0].url), { from: base.from, to: base.to });
  assertEquals(out.data, insight);
});

Deno.test("insight-get: requires an insight id and a valid window", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(insightGet.execute({ ...base, insightId: "" }, ctx)),
    Error,
    "insightId is required",
  );
  await assertRejects(
    () => Promise.resolve(insightGet.execute({ ...base, to: base.from }, ctx)),
    Error,
    "from must be before to",
  );
  assertEquals(calls.length, 0);
});

Deno.test("insight-get: a not-found 400 surfaces", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "Insight not found", status: 400 } }]);
  await assertRejects(
    () => Promise.resolve(insightGet.execute(base, ctx)),
    Error,
    "Perspective 400: Insight not found",
  );
});
