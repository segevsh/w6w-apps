import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: is a bearer method exposing an `apiKey` secret field", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "bearer");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign appends Bearer using credential.apiKey", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "cal_abc" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer cal_abc");
});

Deno.test("api-key: test hits /v2/me and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: 1 } } }]);
  const result = await auth.test({ credential: { apiKey: "cal_abc" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.cal.com");
  assertEquals(url.pathname, "/v2/me");
  assertEquals(calls[0].headers["authorization"], "Bearer cal_abc");
});

Deno.test("api-key: test reports failure when credential missing", async () => {
  const { ctx } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("missing"));
});

Deno.test("api-key: test reports failure with status code when API rejects", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: { message: "not valid" } } }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
});

Deno.test("api-key: afterConnect maps /v2/me data into a user label", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: { id: 1, username: "jdoe", name: "Jane Doe", email: "jane@example.com" } },
  }]);
  const out = await auth.afterConnect!({ credential: { apiKey: "cal_abc" } }, ctx);
  assertEquals(out, {
    user: { id: 1, username: "jdoe", name: "Jane Doe", email: "jane@example.com" },
  });
});

Deno.test("api-key: afterConnect returns {} when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const out = await auth.afterConnect!({ credential: { apiKey: "cal_abc" } }, ctx);
  assertEquals(out, {});
});
