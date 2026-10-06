import { assertEquals } from "@std/assert";
import action from "../../actions/issue-note-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("issue-note-create: POSTs an internal note to /issues/{id}/note", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "m2", issue_id: "i1" } } }]);
  const out = await action.execute!({
    id: "i1",
    bodyHtml: "<p>checked</p>",
    threadId: "th1",
    userId: "u1",
  }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/issues/i1/note");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    body_html: "<p>checked</p>",
    thread_id: "th1",
    user_id: "u1",
  });
  assertEquals(out, { id: "m2", issue_id: "i1" });
});

Deno.test("issue-note-create: only the body is sent when no thread is chosen", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ id: "i1", bodyHtml: "x", threadName: "Triage" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { body_html: "x", thread_name: "Triage" });
  assertEquals(action.idempotent, false);
});
