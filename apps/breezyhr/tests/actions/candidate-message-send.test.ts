import { assertEquals } from "@std/assert";
import action from "../../actions/candidate-message-send.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("candidate-message-send: POSTs body and subject to the conversation", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "m1", type: "messageSent" } }]);
  const out = await action.execute!(
    { companyId: "c1", positionId: "p1", candidateId: "k1", body: "<p>Hi</p>", subject: "Hello" },
    ctx,
  );
  assertEquals(
    calls[0].url,
    "https://api.breezy.hr/v3/company/c1/position/p1/candidate/k1/conversation",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { body: "<p>Hi</p>", subject: "Hello" });
  assertEquals(out, { _id: "m1", type: "messageSent" });
  assertEquals(action.idempotent, false);
});

Deno.test("candidate-message-send: no subject is sent when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ companyId: "c1", positionId: "p1", candidateId: "k1", body: "x" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { body: "x" });
});
