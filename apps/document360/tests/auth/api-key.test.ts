import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import {
  CA,
  envelope,
  EU,
  listEnvelope,
  mockCtx,
  pathOf,
  problem,
  PROBLEM_HEADERS,
  queryOf,
} from "../_helpers.ts";

const KEY = "d360_sk_unitTestFixtureNotARealKey000000";

Deno.test("api-key: sign stamps X-API-Key and nothing else", () => {
  const request = {
    method: "GET",
    url: `${EU}/v3/projects`,
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers, { "x-api-key": KEY });
  assertEquals(signed.url, `${EU}/v3/projects`);
  assert(!signed.url.includes(KEY));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: KEY }), { "x-api-key": KEY });
  assertEquals(authHeaders({}), { "x-api-key": "" });
});

Deno.test("api-key: declares the three data centers and an optional project id", () => {
  const fields = apiKey.fields!;
  assertEquals(fields.map((f) => f.key), ["apiKey", "region", "projectId"]);
  assertEquals(fields[0].type, "secret");
  assertEquals(fields[0].required, true);
  assertEquals(fields[1].required, true);
  assertEquals(
    (fields[1].options as Array<{ value: string }>).map((o) => o.value),
    ["eu", "us", "ca"],
  );
  assertEquals(fields[2].required, undefined);
  assertEquals(apiKey.apiKey, { in: "header", name: "X-API-Key" });
});

Deno.test("api-key: test passes on a projects envelope, and probes the credential's region", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "p1" }]) }]);
  const result = await apiKey.test({ credential: { apiKey: KEY, region: "ca" } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url.startsWith(CA), true);
  assertEquals(pathOf(calls[0].url), PROBE_PATH);
  assertEquals(queryOf(calls[0].url), { page_size: "1" });
  assertEquals(calls[0].headers["x-api-key"], KEY);
});

Deno.test("api-key: test defaults to Europe when no region is given", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  assertEquals((await apiKey.test({ credential: { apiKey: KEY } }, ctx)).ok, true);
  assertEquals(calls[0].url.startsWith(EU), true);
});

Deno.test("api-key: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await apiKey.test({ credential: { apiKey: "  " } }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: a 200 that is not the projects envelope fails (wrong data center, SPA shell)", async () => {
  const { ctx } = mockCtx([{
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  const r = await apiKey.test({ credential: { apiKey: KEY, region: "us" } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("us"));
});

Deno.test("api-key: an empty-body 401 is a rejection that names the region", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const r = await apiKey.test({ credential: { apiKey: KEY, region: "us" } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("us data center"));
  assert(!r.message?.includes(KEY));
});

Deno.test("api-key: 403 FORBIDDEN means the key is live but lacks the probe's permission", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    headers: PROBLEM_HEADERS,
    body: problem(403, "FORBIDDEN", "Not permitted."),
  }]);
  const r = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(r.ok, true);
  assert(r.message?.includes("ViewProjectSettings"));
});

Deno.test("api-key: plan and entitlement 403 codes fail, whatever the status says", async () => {
  for (
    const code of [
      "FEATURE_NOT_IN_LICENSE",
      "PREMIUM_FEATURE_NOT_IN_LICENSE",
      "LICENSE_LIMIT_EXCEEDED",
    ]
  ) {
    const { ctx } = mockCtx([{
      status: 403,
      headers: PROBLEM_HEADERS,
      body: problem(403, code, "Plan."),
    }]);
    const r = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
    assertEquals(r.ok, false, code);
    assert(r.message?.includes(code), `${code}: ${r.message}`);
  }
});

Deno.test("api-key: other failures are described from the body", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    headers: { ...PROBLEM_HEADERS, "retry-after": "9" },
    body: problem(429, "TOO_MANY_REQUESTS", "Slow."),
  }]);
  const r = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("TOO_MANY_REQUESTS"));
});

Deno.test("api-key: afterConnect fills in the single visible project", async () => {
  const { ctx } = mockCtx([{ body: listEnvelope([{ id: "p1", name: "Product Docs" }]) }]);
  const out = await apiKey.afterConnect!({ credential: { apiKey: KEY, region: "us" } }, ctx);
  assertEquals(out, { region: "us", projectId: "p1", projectName: "Product Docs" });
});

Deno.test("api-key: afterConnect keeps the given project id and names it when found", async () => {
  const { ctx } = mockCtx([{
    body: listEnvelope([{ id: "p1", name: "A" }, { id: "p2", name: "B" }]),
  }]);
  const out = await apiKey.afterConnect!({ credential: { apiKey: KEY, projectId: "p2" } }, ctx);
  assertEquals(out, { region: "eu", projectId: "p2", projectName: "B" });
});

Deno.test("api-key: afterConnect does not guess among several projects", async () => {
  const { ctx } = mockCtx([{
    body: listEnvelope([{ id: "p1", name: "A" }, { id: "p2", name: "B" }]),
  }]);
  const out = await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx);
  assertEquals(out, { region: "eu", projectName: "Document360" });
});

Deno.test("api-key: afterConnect survives a failing probe and a thrown fetch", async () => {
  const forbidden = mockCtx([{
    status: 403,
    headers: PROBLEM_HEADERS,
    body: problem(403, "FORBIDDEN", "x"),
  }]);
  assertEquals(
    await apiKey.afterConnect!({ credential: { apiKey: KEY, projectId: "p9" } }, forbidden.ctx),
    { region: "eu", projectName: "Document360", projectId: "p9" },
  );
  const empty = mockCtx([]);
  assertEquals(
    await apiKey.afterConnect!({ credential: { apiKey: KEY } }, empty.ctx),
    { region: "eu", projectName: "Document360" },
  );
  assertEquals(typeof envelope, "function");
});
