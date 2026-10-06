import { assert, assertEquals } from "@std/assert";
import apiKey, { classifyProbeFailure, probeUrl } from "../auth/api-key.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "./_helpers.ts";

const req = () => ({
  url: "https://api.elasticemail.com/v4/contacts",
  method: "GET",
  headers: {} as Record<string, string>,
});

Deno.test("api-key: sign stamps X-ElasticEmail-ApiKey and nothing else", async () => {
  const out = await apiKey.sign!(
    { request: req(), credential: { apiKey: "k-123" } } as never,
    mockCtx().ctx,
  );
  assertEquals(out.headers["x-elasticemail-apikey"], "k-123");
  assertEquals(Object.keys(out.headers), ["x-elasticemail-apikey"]);
});

Deno.test("api-key: test probes GET /v4/statistics with `from` and passes on a stats body", async () => {
  const { ctx, calls } = mockCtx([{ body: { Recipients: 0, EmailTotal: 0, Delivered: 0 } }]);
  const out = await apiKey.test({ credential: { apiKey: "k" } } as never, ctx);
  assertEquals(out, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v4/statistics");
  assert(/^\d{4}-\d{2}-\d{2}T00:00:00$/.test(queryOf(calls[0].url).from));
  assertEquals(calls[0].headers["x-elasticemail-apikey"], "k");
});

Deno.test("api-key: test classifies from the body's Error text, not the status", async () => {
  const bad = mockCtx([{ status: 400, body: errorBody("APIKey Expired") }]);
  const r1 = await apiKey.test({ credential: { apiKey: "x" } } as never, bad.ctx);
  assertEquals(r1.ok, false);
  assertEquals(r1.message?.includes("rejected the API key"), true);

  const scope = mockCtx([{ status: 403, body: errorBody("Access level too low") }]);
  const r2 = await apiKey.test({ credential: { apiKey: "x" } } as never, scope.ctx);
  assertEquals(r2.message?.includes("ViewReports"), true);

  const other = mockCtx([{ status: 500, body: "oops" }]);
  const r3 = await apiKey.test({ credential: { apiKey: "x" } } as never, other.ctx);
  assertEquals(r3.message?.includes("500"), true);

  // a 200 that is not a stats object is NOT a pass
  const odd = mockCtx([{ body: "<html>shell</html>" }]);
  assertEquals((await apiKey.test({ credential: { apiKey: "x" } } as never, odd.ctx)).ok, false);
  const envelope = mockCtx([{ status: 200, body: errorBody("APIKey Expired") }]);
  assertEquals(
    (await apiKey.test({ credential: { apiKey: "x" } } as never, envelope.ctx)).ok,
    false,
  );
});

Deno.test("api-key: classifyProbeFailure falls back to the status for an unreadable body", () => {
  assertEquals(classifyProbeFailure(502, null).message.includes("502"), true);
  assertEquals(
    classifyProbeFailure(400, { Error: "Something new" }).message.includes("Something new"),
    true,
  );
});

Deno.test("api-key: test fails without calling the network when the key is empty", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await apiKey.test({ credential: {} } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: probeUrl uses the supplied date", () => {
  assertEquals(
    probeUrl(new Date("2026-10-06T12:34:56Z")),
    "https://api.elasticemail.com/v4/statistics?from=2026-10-06T00:00:00",
  );
});
