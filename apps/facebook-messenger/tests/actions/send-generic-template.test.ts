import { assertEquals, assertRejects } from "@std/assert";
import { bodyOf, mockCtx, SENT } from "../_helpers.ts";
import action from "../../actions/send-generic-template.ts";

const el = {
  title: "Welcome!",
  subtitle: "Hats",
  buttons: [{ type: "postback", title: "Go", payload: "GO" }],
};

Deno.test("send-generic-template: builds the generic template payload", async () => {
  const { ctx, calls } = mockCtx([{ body: SENT }]);
  await action.execute!({ recipientId: "p", elements: [el] }, ctx);
  assertEquals(bodyOf(calls[0]).message, {
    attachment: { type: "template", payload: { template_type: "generic", elements: [el] } },
  });
});

Deno.test("send-generic-template: sharable is sent only when true", async () => {
  const { ctx, calls } = mockCtx([{ body: SENT }]);
  await action.execute!({ recipientId: "p", elements: [el], sharable: true }, ctx);
  const payload = (bodyOf(calls[0]).message as { attachment: { payload: Record<string, unknown> } })
    .attachment.payload;
  assertEquals(payload.sharable, true);
});

Deno.test("send-generic-template: more than 10 elements are rejected locally", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ recipientId: "p", elements: Array(11).fill(el) }, ctx),
    Error,
    "1 to 10",
  );
  await assertRejects(
    async () => await action.execute!({ recipientId: "p", elements: "[]" }, ctx),
    Error,
    "1 to 10",
  );
  assertEquals(calls.length, 0);
});
