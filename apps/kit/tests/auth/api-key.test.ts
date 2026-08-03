import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api-key: declares a header-borne apiKey credential", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey?.in, "header");
  assertEquals(auth.apiKey?.name, "X-Kit-Api-Key");
});

Deno.test("api-key: the key field is a secret", () => {
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "no apiKey field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign stamps X-Kit-Api-Key and returns the request", () => {
  const request = { url: "https://api.kit.com/v4/account", headers: {} as Record<string, string> };
  const out = auth.sign!(
    { request, credential: { apiKey: "sk_test" } } as never,
    undefined as never,
  );
  assertEquals((out as typeof request).headers["X-Kit-Api-Key"], "sk_test");
});

Deno.test("api-key: sign puts the key in a header, never a query string", () => {
  const request = { url: "https://api.kit.com/v4/account", headers: {} as Record<string, string> };
  const out = auth.sign!(
    { request, credential: { apiKey: "sk_test" } } as never,
    undefined as never,
  );
  assert(
    !(out as typeof request).url.includes("sk_test"),
    "credential leaked into the URL — that was the v3 mistake",
  );
});

Deno.test("api-key: test probes GET /v4/account and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { account: { id: 1 } } }]);
  const out = await auth.test!({ credential: { apiKey: "sk_test" } } as never, ctx);
  assertEquals(calls[0].url, "https://api.kit.com/v4/account");
  assertEquals(calls[0].headers["x-kit-api-key"], "sk_test");
  assertEquals(out.ok, true);
});

Deno.test("api-key: test reports the status on a rejected credential", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["The access token is invalid"] } }]);
  const out = await auth.test!({ credential: { apiKey: "bad" } } as never, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("401"));
});

Deno.test("api-key: test fails fast when the credential has no key", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await auth.test!({ credential: {} } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0, "should not have called the network");
});

Deno.test("api-key: afterConnect labels the connection from the account", async () => {
  const { ctx } = mockCtx([{
    body: {
      user: { email: "ada@example.com", id: 7 },
      account: {
        id: 42,
        name: "Ada's Newsletter",
        plan_type: "creator_pro",
        primary_email_address: "hello@example.com",
      },
    },
  }]);
  const out = await auth.afterConnect!({ credential: { apiKey: "sk_test" } } as never, ctx);
  assertEquals((out as { account: Record<string, unknown> }).account, {
    id: 42,
    name: "Ada's Newsletter",
    planType: "creator_pro",
    email: "hello@example.com",
  });
});

Deno.test("api-key: afterConnect falls back to the user email and tolerates failure", async () => {
  const { ctx } = mockCtx([{ body: { user: { email: "ada@example.com" }, account: { id: 42 } } }]);
  const out = await auth.afterConnect!({ credential: { apiKey: "sk_test" } } as never, ctx);
  assertEquals((out as { account: { email: string } }).account.email, "ada@example.com");

  const failed = mockCtx([{ status: 500, body: {} }]);
  assertEquals(
    await auth.afterConnect!({ credential: { apiKey: "sk_test" } } as never, failed.ctx),
    {},
  );
});
