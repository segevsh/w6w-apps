import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/bot-token.ts";

Deno.test("bot-token: collects exactly one secret field", () => {
  assertEquals(auth.key, "bot-token");
  assertEquals(auth.type, "bearer");
  assertEquals(auth.fields?.length, 1);
  assertEquals(auth.fields![0].key, "accessToken");
  assertEquals(auth.fields![0].type, "secret");
  assert(auth.fields![0].required);
});

Deno.test("bot-token: sign substitutes the token into the URL path", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.telegram.org/bot{token}/sendMessage",
    method: "POST",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "123:ABC" } }, ctx);
  assertEquals(out.url, "https://api.telegram.org/bot123:ABC/sendMessage");
  // The token belongs in the path only — no header should appear.
  assertEquals("authorization" in out.headers, false);
});

Deno.test("bot-token: sign leaves a URL without the placeholder untouched", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.telegram.org/getMe",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "123:ABC" } }, ctx);
  assertEquals(out.url, "https://api.telegram.org/getMe");
});

Deno.test("bot-token: test rejects an empty credential without touching the network", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing accessToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("bot-token: test calls getMe and reports Telegram's own description on failure", async () => {
  const ok = mockCtx([{ body: { ok: true, result: { id: 1, username: "acme_bot" } } }]);
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, ok.ctx), { ok: true });
  assertEquals(ok.calls[0].url, "https://api.telegram.org/bott/getMe");

  const bad = mockCtx([{ status: 401, body: { ok: false, description: "Unauthorized" } }]);
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, bad.ctx), {
    ok: false,
    message: "Unauthorized",
  });
});

Deno.test("bot-token: afterConnect labels the connection with the bot identity", async () => {
  const { ctx, calls } = mockCtx([
    { body: { ok: true, result: { id: 42, username: "acme_bot", first_name: "Acme" } } },
  ]);
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), {
    bot: { id: 42, username: "acme_bot", name: "Acme" },
  });
  // Goes through the placeholder so the runtime signs it like any other call.
  assertEquals(calls[0].url, "https://api.telegram.org/bot{token}/getMe");
});

Deno.test("bot-token: afterConnect degrades to {} when getMe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), {});
});
