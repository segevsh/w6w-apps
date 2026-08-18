import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/conversation-assign.ts";

Deno.test("conversation-assign: PUTs the teammate onto the assignee route", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({ conversationId: "cnv_1", assigneeId: "tea_1" }, ctx), {
    ok: true,
    assigneeId: "tea_1",
  });
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/conversations/cnv_1/assignee");
  assertEquals(JSON.parse(calls[0].body!), { assignee_id: "tea_1" });
});

/** Unassigning is half of what round-robin needs, and a form cannot type null. */
Deno.test("conversation-assign: an empty assignee unassigns", async () => {
  for (const value of ["", "null", "  "]) {
    const { ctx, calls } = mockCtx([{ status: 204 }]);
    await action.execute!({ conversationId: "cnv_1", assigneeId: value }, ctx);
    assertEquals(JSON.parse(calls[0].body!), { assignee_id: null });
  }
});

Deno.test("conversation-assign: an email alias passes through untouched", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ conversationId: "cnv_1", assigneeId: "alt:email:ada@example.com" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).assignee_id, "alt:email:ada@example.com");
});

Deno.test("conversation-assign: a missing conversation id is refused", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ assigneeId: "tea_1" }, ctx),
    Error,
    "conversationId",
  );
});
