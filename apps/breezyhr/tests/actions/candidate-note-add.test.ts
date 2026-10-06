import { assertEquals } from "@std/assert";
import action from "../../actions/candidate-note-add.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("candidate-note-add: POSTs the note body to the stream", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "s1", type: "companyNotePosted" } }]);
  const out = await action.execute!(
    { companyId: "c1", positionId: "p1", candidateId: "k1", body: "call back" },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/position/p1/candidate/k1/stream");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { body: "call back" });
  assertEquals(out, { _id: "s1", type: "companyNotePosted" });
  assertEquals(action.idempotent, false);
});
