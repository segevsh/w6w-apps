import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

const ME = {
  id: "m1",
  role: "owner",
  user: { id: "u1", name: "A", email: "a@b.test" },
  account: { id: "a1", name: "Acme", plan_tier: "business" },
};

Deno.test("api-key: signs with the X-Api-Key header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://www.signwell.com/api/v1/me",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "abc123" } }, ctx);
  assertEquals(out.headers["x-api-key"], "abc123");
  assertEquals(auth.apiKey, { in: "header", name: "X-Api-Key" });
  assertEquals(auth.type, "apiKey");
});

Deno.test("api-key: apiKey is the one required field, and a secret", () => {
  assertEquals(auth.fields!.map((f) => [f.key, f.type, f.required]), [["apiKey", "secret", true]]);
});

Deno.test("api-key: test passes on the documented /me shape, with the key as a header", async () => {
  const { ctx, calls } = mockCtx([{ body: ME }]);
  assertEquals(await auth.test!({ credential: { apiKey: "k" } } as never, ctx), { ok: true });
  assertEquals(calls[0].url, "https://www.signwell.com/api/v1/me");
  assertEquals(calls[0].headers["x-api-key"], "k");
});

Deno.test("api-key: a missing key fails before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test!({ credential: {} } as never, ctx), {
    ok: false,
    message: "credential missing apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: a rejected key is classified from the vendor's code, never echoing the key", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      message: "Missing or invalid authorization key",
      meta: { error: "api_key_unauthorized_error", message: "Not valid authorization token" },
    },
  }]);
  const result = await auth.test!({ credential: { apiKey: "wrong-key-xyz" } } as never, ctx) as {
    ok: boolean;
    message: string;
  };
  assertEquals(result.ok, false);
  assert(result.message.includes("api_key_unauthorized_error"), result.message);
  assert(!result.message.includes("wrong-key-xyz"), "the credential must never be echoed back");
});

Deno.test("api-key: another error code is reported from its own body", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { message: "x", meta: { error: "missing_authorization_key_error", message: "Missing" } },
  }]);
  const result = await auth.test!({ credential: { apiKey: "k" } } as never, ctx) as {
    ok: boolean;
    message: string;
  };
  assertEquals(result.ok, false);
  assert(result.message.includes("missing_authorization_key_error"), result.message);
});

Deno.test("api-key: a 200 that is not the account shape is NOT a pass", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>shell</html>" }]);
  const result = await auth.test!({ credential: { apiKey: "k" } } as never, ctx) as {
    ok: boolean;
    message: string;
  };
  assertEquals(result.ok, false);
  assert(result.message.includes("account shape"), result.message);
});
