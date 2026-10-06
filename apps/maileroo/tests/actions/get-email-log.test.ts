import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-email-log.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-email-log: encodes the message id and maps the raw message", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        from: "a@d.com",
        to: "b@x.com",
        raw_email: "From: a",
        collected_on: "2026-06-28 10:00:00",
      },
    },
  }]);
  const out = await run(action, { messageId: "<abc@mail.maileroo.com>" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.maileroo.com/v1/logs/email/%3Cabc%40mail.maileroo.com%3E",
  );
  assertEquals(out, {
    from: "a@d.com",
    to: ["b@x.com"],
    rawEmail: "From: a",
    collectedOn: "2026-06-28 10:00:00",
  });
});

Deno.test("get-email-log: a 404 throws", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: { message: "Email not found" } } }]);
  await assertRejects(() => run(action, { messageId: "x" }, ctx), Error, "Email not found");
});
