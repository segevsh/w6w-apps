import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/whatsapp-message-send.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("whatsapp-message-send: POST with the documented query parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", request_id: "r" } }]);
  const out = await action.execute({
    integratedNumber: "15550236673",
    recipientNumber: "919876543210",
    text: "Thanks, we got it",
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v5/whatsapp/whatsapp-outbound-message/");
  assertEquals(queryOf(calls[0].url), {
    integrated_number: "15550236673",
    recipient_number: "919876543210",
    content_type: "text",
    text: "Thanks, we got it",
  });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(out, { response: { status: "success", request_id: "r" } });
});

Deno.test("whatsapp-message-send: every field is required", async () => {
  await assertRejects(async () =>
    await action.execute({ integratedNumber: "1", recipientNumber: "2" }, mockCtx([]).ctx)
  );
});

Deno.test("whatsapp-message-send: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await action.execute({ integratedNumber: "9199", recipientNumber: "9188", text: "hi" }, ctx);
  assertEquals(calls[0].headers.authkey, undefined);
  assert(!calls[0].url.toLowerCase().includes("authkey"));
  assert(calls[0].url.startsWith("https://control.msg91.com/api/v5/"));
});

Deno.test("whatsapp-message-send: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ body: { type: "error", message: "Auth Key missing" } }]);
  const err = await assertRejects(async () =>
    await action.execute({ integratedNumber: "9199", recipientNumber: "9188", text: "hi" }, ctx)
  ) as Error;
  assert(err.message.includes("Auth Key missing"));
});
