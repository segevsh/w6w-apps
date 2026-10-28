import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/access-token.ts";

Deno.test("access-token: collects one secret field plus two non-secret identity fields", () => {
  assertEquals(auth.key, "access-token");
  assertEquals(auth.type, "bearer");
  assertEquals(auth.fields?.length, 3);
  const byKey = Object.fromEntries((auth.fields ?? []).map((f) => [f.key, f]));
  assertEquals(byKey.accessToken.type, "secret");
  assert(byKey.accessToken.required);
  assertEquals(byKey.phoneNumberId.type, "string");
  assert(byKey.phoneNumberId.required);
  assertEquals(byKey.wabaId.type, "string");
  assert(!byKey.wabaId.required);
});

Deno.test("access-token: sign stamps a plain Bearer header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://graph.facebook.com/v23.0/1234567890/messages",
    method: "POST",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "EAA...token" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer EAA...token");
  // URL is untouched — unlike Telegram, WhatsApp carries the token in a header only.
  assertEquals(out.url, request.url);
});

Deno.test("access-token: test rejects a credential missing either field, without touching the network", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, ctx), {
    ok: false,
    message: "credential missing accessToken or phoneNumberId",
  });
  assertEquals(calls.length, 0);
});

Deno.test("access-token: test calls GET /{phoneNumberId} and reports Meta's own error message on failure", async () => {
  const ok = mockCtx([{ body: { verified_name: "Acme Support" } }]);
  assertEquals(
    await auth.test({ credential: { accessToken: "t", phoneNumberId: "123" } }, ok.ctx),
    { ok: true },
  );
  assertEquals(ok.calls[0].url, "https://graph.facebook.com/v23.0/123?fields=verified_name");
  assertEquals(ok.calls[0].headers["authorization"], "Bearer t");

  const bad = mockCtx([
    { status: 401, body: { error: { message: "Invalid OAuth access token", code: 190 } } },
  ]);
  assertEquals(
    await auth.test({ credential: { accessToken: "bad", phoneNumberId: "123" } }, bad.ctx),
    { ok: false, message: "Invalid OAuth access token" },
  );
});

Deno.test("access-token: afterConnect labels the connection with the verified name and phone number", async () => {
  const { ctx, calls } = mockCtx([
    { body: { verified_name: "Acme Support", display_phone_number: "+1 555-123-4567" } },
  ]);
  const out = await auth.afterConnect!({
    credential: { accessToken: "t", phoneNumberId: "123", wabaId: "456" },
  }, ctx);
  assertEquals(out, {
    phoneNumberId: "123",
    wabaId: "456",
    verifiedName: "Acme Support",
    displayPhoneNumber: "+1 555-123-4567",
  });
  assertEquals(
    calls[0].url,
    "https://graph.facebook.com/v23.0/123?fields=verified_name,display_phone_number",
  );
});

Deno.test("access-token: afterConnect degrades to the identity fields when the lookup fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const out = await auth.afterConnect!({
    credential: { accessToken: "t", phoneNumberId: "123", wabaId: "456" },
  }, ctx);
  assertEquals(out, { phoneNumberId: "123", wabaId: "456" });
});

Deno.test("access-token: afterConnect returns {} when phoneNumberId is missing", async () => {
  const { ctx, calls } = mockCtx();
  const out = await auth.afterConnect!({ credential: { accessToken: "t" } }, ctx);
  assertEquals(out, {});
  assertEquals(calls.length, 0);
});
