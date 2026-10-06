import { assertEquals } from "@std/assert";
import action from "../../actions/candidate-stream-list.ts";
import { mockCtx } from "../_helpers.ts";

type Rec = Record<string, unknown>;

const base = { companyId: "c1", positionId: "p1", candidateId: "k1" };
const page = (n: number, extra: Record<string, unknown> = {}) =>
  Array.from(
    { length: n },
    (_, i) => (i === n - 1 ? { _id: String(i), ...extra } : { _id: String(i) }),
  );

Deno.test("candidate-stream-list: a full page offers the next skip", async () => {
  const { ctx, calls } = mockCtx([{ body: page(50) }]);
  const out = await action.execute!({ ...base, skip: 50 }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.breezy.hr/v3/company/c1/position/p1/candidate/k1/stream?skip=50",
  );
  assertEquals((out as Rec).nextSkip, 100);
});

Deno.test("candidate-stream-list: the first_activity record ends paging even on a full page", async () => {
  const { ctx } = mockCtx([{ body: page(50, { first_activity: true }) }]);
  assertEquals("nextSkip" in ((await action.execute!(base, ctx)) as Rec), false);
});

Deno.test("candidate-stream-list: a short page has no next skip", async () => {
  const { ctx } = mockCtx([{ body: page(3) }]);
  const out = await action.execute!(base, ctx);
  assertEquals("nextSkip" in (out as Rec), false);
  assertEquals(((out as Rec).activities as unknown[]).length, 3);
});
