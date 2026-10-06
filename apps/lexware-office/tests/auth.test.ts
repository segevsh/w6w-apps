import { assertEquals } from "@std/assert";
import apiKey from "../auth/api-key.ts";
import { gateway, mockCtx, pathOf } from "./_helpers.ts";

const req = () => ({
  url: "https://api.lexware.io/v1/contacts",
  method: "GET",
  headers: {} as Record<string, string>,
});

Deno.test("api-key: is a bearer method with one secret field", () => {
  assertEquals(apiKey.type, "bearer");
  assertEquals(apiKey.fields?.map((f) => [f.key, f.type]), [["apiKey", "secret"]]);
});

Deno.test("api-key: sign stamps the bearer header", async () => {
  const out = await apiKey.sign!(
    { request: req(), credential: { apiKey: "k-123" } } as never,
    mockCtx().ctx,
  );
  assertEquals(out.headers["authorization"], "Bearer k-123");
});

Deno.test("api-key: test probes GET /v1/profile with the key and passes on 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { organizationId: "o", companyName: "T" } }]);
  const out = await apiKey.test({ credential: { apiKey: " k " } } as never, ctx);
  assertEquals(out, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v1/profile");
  assertEquals(calls[0].headers["authorization"], "Bearer k");
});

Deno.test("api-key: test classifies from the body message, not the status", async () => {
  const bad = mockCtx([{ status: 401, body: gateway("Unauthorized") }]);
  const r1 = await apiKey.test({ credential: { apiKey: "x" } } as never, bad.ctx);
  assertEquals(r1.ok, false);
  assertEquals(r1.message?.includes("rejected the API key"), true);

  // Same body under an unexpected status is still a rejected key.
  const odd = mockCtx([{ status: 400, body: gateway("Unauthorized") }]);
  const r2 = await apiKey.test({ credential: { apiKey: "x" } } as never, odd.ctx);
  assertEquals(r2.message?.includes("rejected the API key"), true);

  const malformed = mockCtx([{
    status: 403,
    body: gateway(
      "'Bearer abc' not a valid key=value pair (missing equal-sign) in Authorization header",
    ),
  }]);
  const r3 = await apiKey.test({ credential: { apiKey: "Bearer abc" } } as never, malformed.ctx);
  assertEquals(r3.message?.includes("without a `Bearer `"), true);

  const contract = mockCtx([{ status: 402, body: { status: 402, message: "contract" } }]);
  const r4 = await apiKey.test({ credential: { apiKey: "x" } } as never, contract.ctx);
  assertEquals(r4.message?.includes("402"), true);

  const other = mockCtx([{ status: 500, body: "oops" }]);
  const r5 = await apiKey.test({ credential: { apiKey: "x" } } as never, other.ctx);
  assertEquals(r5.message?.includes("500"), true);
});

Deno.test("api-key: test fails without a network call when the key is empty", async () => {
  const { ctx, calls } = mockCtx();
  const out = await apiKey.test({ credential: { apiKey: "  " } } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect keeps the company name only, and is silent on failure", async () => {
  const ok = mockCtx([{
    body: {
      organizationId: "o1",
      companyName: "Testfirma GmbH",
      created: { userName: "Erika", userEmail: "e@x.de" },
    },
  }]);
  const label = await apiKey.afterConnect!({ credential: { apiKey: "k" } } as never, ok.ctx);
  assertEquals(label, { companyName: "Testfirma GmbH", organizationId: "o1" });
  const bad = mockCtx([{ status: 401, body: gateway("Unauthorized") }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: "k" } } as never, bad.ctx), {});
});
