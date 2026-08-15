import { assert, assertEquals, assertThrows } from "@std/assert";
import smsSend from "../../actions/sms-send.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("sms-send: posts the JSON body shape, no multipart/attachments", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: 1, conversationId: 2, messageStatus: "Sent" } },
  ]);
  const out = await smsSend.execute(
    { from: "+15550000000", to: "+15550000001", text: "hi there" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/restapi/v1.0/account/~/extension/~/sms");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    from: { phoneNumber: "+15550000000" },
    to: [{ phoneNumber: "+15550000001" }],
    text: "hi there",
  });
  assertEquals(out.messageStatus, "Sent");
});

Deno.test("sms-send: multiple comma-separated recipients become multiple `to` entries", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await smsSend.execute(
    { from: "+15550000000", to: "+15550000001, +15550000002", text: "hi" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!) as { to: Array<{ phoneNumber: string }> };
  assertEquals(body.to, [{ phoneNumber: "+15550000001" }, { phoneNumber: "+15550000002" }]);
});

Deno.test("sms-send: an empty `to` fails synchronously, before making a request", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(
    () => smsSend.execute({ from: "+15550000000", to: "", text: "hi" }, ctx),
    Error,
    "phone number",
  );
  assertEquals(calls.length, 0);
});

Deno.test("sms-send: is not idempotent — the vendor documents no idempotency key on this endpoint", () => {
  assertEquals(smsSend.idempotent, false);
});

Deno.test("sms-send: source builds no multipart body — attachments/MMS are out of scope", async () => {
  const src = await Deno.readTextFile(new URL("../../actions/sms-send.ts", import.meta.url));
  assert(!/multipart/i.test(src.replace(/\/\*[\s\S]*?\*\//g, "")));
});
