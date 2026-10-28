import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-message.ts";

Deno.test("get-message: GET /{id} with the documented default fields", async () => {
  const msg = { id: "m1", created_time: "t", message: "Hi", from: { id: "1" } };
  const { ctx, calls } = mockCtx([{ body: msg }]);
  const out = await action.execute!({ messageId: "m1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v26.0/m1");
  assertEquals(url.searchParams.get("fields"), "id,created_time,from,to,message,reply_to");
  assertEquals(out, msg);
});

Deno.test("get-message: custom fields and id encoding", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ messageId: "a/b", fields: "id,message" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v26.0/a%2Fb");
  assertEquals(url.searchParams.get("fields"), "id,message");
});

Deno.test("get-message: an expired message surfaces Meta's error", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: { message: "message deleted", code: 100 } },
  }]);
  await assertRejects(
    async () => await action.execute!({ messageId: "old" }, ctx),
    Error,
    "message deleted",
  );
});
