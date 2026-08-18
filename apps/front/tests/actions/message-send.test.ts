import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-send.ts";

Deno.test("message-send: posts through the named channel", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { id: "msg_1" } }]);
  await action.execute!(
    { channelId: "cha_1", to: "ada@example.com", subject: "Hi", body: "<p>hi</p>" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/channels/cha_1/messages");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.to, ["ada@example.com"]);
  assertEquals(sent.subject, "Hi");
});

/** Front archives the conversation it creates unless told otherwise. */
Deno.test("message-send: archive is explicit and defaults to false here too", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { id: "msg_1" } }]);
  await action.execute!({ channelId: "cha_1", to: "a@b.test", body: "x" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assert("archive" in sent.options);
  assertEquals(sent.options.archive, false);
});

Deno.test("message-send: a channel and a recipient are both required", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ to: "a@b.test", body: "x" }, ctx),
    Error,
    "channelId",
  );
  await assertRejects(
    async () => await action.execute!({ channelId: "cha_1", body: "x" }, ctx),
    Error,
    "to",
  );
  assertEquals(calls.length, 0);
});

/** `to` holds handles, not contact ids — the hint has to say so. */
Deno.test("message-send: the recipient hint rules out contact ids", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>).find((p) => p.key === "to")!;
  assert(/NOT a contact id/.test(p.hint!), p.hint);
});
