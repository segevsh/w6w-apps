import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/inbox-conversation-list.ts";

Deno.test("inbox-conversation-list: filters at Front, not afterwards", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { _results: [{ id: "cnv_1" }] } }]);
  await action.execute!({ inboxId: "inb_1", statuses: ["unassigned"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/inboxes/inb_1/conversations");
  assertEquals(url.searchParams.getAll("q[statuses]"), ["unassigned"]);
});

Deno.test("inbox-conversation-list: a missing inbox id is refused", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "inboxId");
  assertEquals(calls.length, 0);
});
