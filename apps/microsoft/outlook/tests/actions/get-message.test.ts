import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-message.ts";

Deno.test("get-message: GETs the message by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1", subject: "hi" } }]);
  const out = await action.execute({ messageId: "m1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/messages/m1");
  assertEquals(calls[0].method, "GET");
  assertEquals((out as { subject: string }).subject, "hi");
});

Deno.test("get-message: percent-encodes the base64-ish ids Graph hands out", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ messageId: "AAMkADA1MTAAAAqldOAAA=" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/messages/AAMkADA1MTAAAAqldOAAA%3D");
});

Deno.test("get-message: passes $select and the body-format Prefer header", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    messageId: "m1",
    select: ["subject", "internetMessageHeaders"],
    bodyContentType: "text",
  }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("$select"),
    "subject,internetMessageHeaders",
  );
  assertEquals(calls[0].headers["prefer"], 'outlook.body-content-type="text"');
});
