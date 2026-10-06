import { assertEquals } from "@std/assert";
import action from "../../actions/candidate-conversation-list.ts";
import { mockCtx } from "../_helpers.ts";

type Rec = Record<string, unknown>;

const base = { companyId: "c1", positionId: "p1", candidateId: "k1" };

Deno.test("candidate-conversation-list: sends include_delayed=1 and skip", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ _id: "m1" }] }]);
  const out = await action.execute!({ ...base, skip: 50, includeDelayed: true }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.breezy.hr/v3/company/c1/position/p1/candidate/k1/conversation?skip=50&include_delayed=1",
  );
  assertEquals(out, { messages: [{ _id: "m1" }] });
});

Deno.test("candidate-conversation-list: a full page offers nextSkip", async () => {
  const { ctx } = mockCtx([{ body: Array.from({ length: 50 }, (_, i) => ({ _id: String(i) })) }]);
  assertEquals(((await action.execute!(base, ctx)) as Rec).nextSkip, 50);
});
