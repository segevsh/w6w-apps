import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/forward-message.ts";

Deno.test("forward-message: POSTs toRecipients at the top level, not under `message`", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined }]);
  const out = await action.execute({
    messageId: "m1",
    to: ["a@b.com", "Carol <c@d.com>"],
    comment: "fyi",
  }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/messages/m1/forward");
  // Graph rejects specifying both the top-level and the nested form, so only
  // the top-level one is ever sent.
  assertEquals(JSON.parse(calls[0].body!), {
    comment: "fyi",
    toRecipients: [
      { emailAddress: { address: "a@b.com" } },
      { emailAddress: { address: "c@d.com", name: "Carol" } },
    ],
  });
  assertEquals(out, { status: 202 });
});

Deno.test("forward-message: omits an absent comment", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined }]);
  await action.execute({ messageId: "m1", to: ["a@b.com"] }, ctx);
  assertEquals(JSON.parse(calls[0].body!).comment, undefined);
});

Deno.test("forward-message: refuses an empty recipient list before calling out", () => {
  const { ctx, calls } = mockCtx();
  assertThrows(
    () => action.execute({ messageId: "m1", to: ["  "] }, ctx),
    Error,
    "at least one address",
  );
  assertEquals(calls.length, 0);
});
