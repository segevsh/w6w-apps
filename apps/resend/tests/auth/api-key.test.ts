import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: signs with a plain bearer token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.resend.com/emails",
    method: "POST" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "re_abc" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer re_abc");
});

Deno.test("api-key: the key is the only field, and it is a secret", () => {
  assertEquals(auth.fields!.map((f) => f.key), ["apiKey"]);
  assertEquals(auth.fields![0].type, "secret");
});

/**
 * A Resend key may be Full access or Sending access. The probe has to be
 * something a sending-only key can reach, or the app reports working
 * connections as broken.
 */
Deno.test("api-key: test probes /emails, which a sending-only key can reach", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  assertEquals(await auth.test!({ credential: { apiKey: "re_abc" } } as never, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.resend.com/emails?limit=1");
  assertEquals(calls[0].headers["authorization"], "Bearer re_abc");
});

Deno.test("api-key: 401 and 403 are different problems and say so", async () => {
  const unauth = mockCtx([{
    status: 401,
    body: { statusCode: 401, message: "Missing API Key", name: "missing_api_key" },
  }]);
  const a = await auth.test!({ credential: { apiKey: "x" } } as never, unauth.ctx) as {
    ok: boolean;
    message: string;
  };
  assertEquals(a.ok, false);
  assert(a.message.includes("401"), a.message);

  const forbidden = mockCtx([{ status: 403, body: {} }]);
  const b = await auth.test!({ credential: { apiKey: "x" } } as never, forbidden.ctx) as {
    ok: boolean;
    message: string;
  };
  assertEquals(b.ok, false);
  assert(b.message.includes("permission"), b.message);
});

Deno.test("api-key: a missing key fails before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test!({ credential: {} } as never, ctx), {
    ok: false,
    message: "credential missing apiKey",
  });
  assertEquals(calls.length, 0);
});
