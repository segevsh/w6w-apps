import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: is a bearer method with one secret field", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "bearer");
  assertEquals(auth.fields?.length, 1);
  assertEquals(auth.fields![0].key, "secretKey");
  assertEquals(auth.fields![0].type, "secret");
  assert(auth.fields![0].required);
});

Deno.test("api-key: sign sets the Bearer header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.stripe.com/v1/balance",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { secretKey: "sk_test_x" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer sk_test_x");
});

Deno.test("api-key: test refuses an empty credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing secretKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test probes /balance and relays Stripe's own message", async () => {
  const ok = mockCtx([{ body: { available: [] } }]);
  assertEquals(await auth.test({ credential: { secretKey: "sk" } }, ok.ctx), { ok: true });
  assertEquals(ok.calls[0].url, "https://api.stripe.com/v1/balance");

  const bad = mockCtx([{ status: 401, body: { error: { message: "Invalid API Key provided" } } }]);
  assertEquals(await auth.test({ credential: { secretKey: "sk" } }, bad.ctx), {
    ok: false,
    message: "Invalid API Key provided",
  });
});

Deno.test("api-key: afterConnect labels the connection with account and mode", async () => {
  const { ctx } = mockCtx([{
    body: {
      id: "acct_1",
      settings: { dashboard: { display_name: "Acme" } },
      charges_enabled: true,
    },
  }]);
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), {
    account: { id: "acct_1", name: "Acme", mode: "live" },
  });
});
