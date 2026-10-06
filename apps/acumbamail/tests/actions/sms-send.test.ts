import { assert, assertEquals, assertRejects } from "@std/assert";
import smsSend from "../../actions/sms-send.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("sms-send: POST /api/1/sendSMS/ with the documented form fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sample: "ok" } }]);
  const out = await smsSend.execute(
    { "messages": [{ "recipient": "+34600000000", "body": "hi", "sender": "Acme" }] } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/1/sendSMS/");
  assert(calls[0].url.startsWith("https://acumbamail.com/"));
  assertEquals(formOf(calls[0]), {
    "messages": '[{"recipient":"+34600000000","body":"hi","sender":"Acme"}]',
  });
  // the credential is stamped by `sign`, never by the action
  assert(!(calls[0].body ?? "").includes("auth_token"));
  assertEquals(out, { result: { sample: "ok" } });
});

Deno.test("sms-send: a vendor error surfaces its status and body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Invalid argument" }]);
  const err = await assertRejects(async () =>
    await smsSend.execute(
      { "messages": [{ "recipient": "+34600000000", "body": "hi", "sender": "Acme" }] } as never,
      ctx,
    )
  );
  assert(String((err as Error).message).includes("(400)"));
  assert(String((err as Error).message).includes("Invalid argument"));
});
