import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: type basic, one required secret field", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "basic");
  const keys = auth.fields?.map((f) => f.key);
  assertEquals(keys, ["apiKey"]);
  assertEquals(auth.fields?.[0].type, "secret");
  assertEquals(auth.fields?.[0].required, true);
});

Deno.test("api-key: sign stamps Authorization: Basic base64(key:)", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://company.clearbit.com/v1/domains/find?name=Clearbit",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "sk_test123" } }, ctx);
  assertEquals(out.headers["authorization"], `Basic ${btoa("sk_test123:")}`);
});

Deno.test("api-key: test rejects a credential with no apiKey, without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test probes GET /v1/domains/find?name=Clearbit with Basic auth", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "Clearbit", domain: "clearbit.com" } }]);
  assertEquals(await auth.test({ credential: { apiKey: "sk_live" } }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://company.clearbit.com/v1/domains/find?name=Clearbit");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("sk_live:")}`);
});

Deno.test("api-key: test surfaces a 401 as a failed check", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: { type: "auth_required" } } }]);
  assertEquals(await auth.test({ credential: { apiKey: "bad" } }, ctx), {
    ok: false,
    message: "Clearbit rejected this key (401)",
  });
});

Deno.test("api-key: test treats a 404 (no match, but authenticated) as ok", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: { type: "not_found" } } }]);
  assertEquals(await auth.test({ credential: { apiKey: "sk_live" } }, ctx), { ok: true });
});

Deno.test("api-key: test surfaces other non-2xx statuses as a failed check", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  assertEquals(await auth.test({ credential: { apiKey: "sk_live" } }, ctx), {
    ok: false,
    message: "Clearbit returned 500",
  });
});
