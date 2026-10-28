import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-message.ts";

Deno.test("get-message: builds spaces/{space}/messages/{message}", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "A1", message: "B1.B1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/A1/messages/B1.B1");
});

Deno.test("get-message: a full message resource name overrides the space field", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "IGNORED", message: "spaces/A9/messages/B9.B9" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/A9/messages/B9.B9");
});

Deno.test("get-message: a client- custom id is a valid message segment", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "A1", message: "client-daily" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/A1/messages/client-daily");
});

Deno.test("get-message: passes markupSyntax through when asked", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute!(
    { space: "A1", message: "B1", markupSyntax: "MARKUP_SYNTAX_MARKDOWN" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).searchParams.get("markupSyntax"), "MARKUP_SYNTAX_MARKDOWN");
  await action.execute!({ space: "A1", message: "B1" }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.has("markupSyntax"), false);
});
