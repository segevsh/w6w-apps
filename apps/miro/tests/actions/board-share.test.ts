import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/board-share.ts";

Deno.test("board-share: sends invitations and is honestly not idempotent", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { successfulEmails: ["a@b.com"] } }], {
    display: {},
  });
  await action.execute!({ boardId: "b1", emails: "a@b.com, c@d.com", role: "editor" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v2/boards/b1/members");
  assertEquals(JSON.parse(calls[0].body!), {
    emails: ["a@b.com", "c@d.com"],
    role: "editor",
  });
  // Re-running re-invites the same people.
  assertEquals(action.idempotent, false);
});

Deno.test("board-share: at least one email is required", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({ boardId: "b1" }, ctx), Error, "`emails`");
  assertEquals(calls.length, 0);
});
