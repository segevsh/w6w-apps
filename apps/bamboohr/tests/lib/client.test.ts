import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  API_PATH,
  apiHost,
  BambooClient,
  BAMBOOHR_DOMAIN,
  compact,
  isValidSubdomain,
  normalizeSubdomain,
  resolveApiUrl,
  withFields,
} from "../../lib/client.ts";
import app from "../../index.ts";
import { mockCtx, TEST_SUBDOMAIN } from "../_helpers.ts";

// ------------------------------------------------- the per-customer base URL --

Deno.test("client: the base URL is the documented per-customer host form", () => {
  // The exact shape from every reference page's OpenAPI `servers` block:
  //   "url": "https://{companyDomain}.bamboohr.com"
  // plus the `/api/v1` prefix from the Getting Started curl sample.
  assertEquals(
    resolveApiUrl({ subdomain: "acme" }),
    "https://acme.bamboohr.com/api/v1",
  );
  assertEquals(API_PATH, "/api/v1");
  assertEquals(BAMBOOHR_DOMAIN, "bamboohr.com");
});

Deno.test("client: the subdomain lands in the HOST, not in a path segment", () => {
  const url = new URL(resolveApiUrl({ subdomain: "acme" }));
  assertEquals(url.hostname, "acme.bamboohr.com");
  assertEquals(url.pathname, "/api/v1");
  // The legacy `gateway.php` form put the customer id in the PATH and used a
  // fixed host. This app implements the documented form, so neither may appear.
  assert(!url.pathname.includes("gateway.php"), "must not use the legacy gateway path");
  assert(!url.pathname.includes("acme"), "subdomain must not also be a path segment");
  assertEquals(url.hostname.startsWith("api."), false, "must not use a fixed api. host");
});

Deno.test("client: the resolved host stays inside the declared egress allowlist", async () => {
  // `w6w.network.allow` is `["*.bamboohr.com"]` — "any subdomain at any depth,
  // NOT the apex". A host that fell outside it would be denied by the sandbox at
  // runtime, which is a much later and much more confusing failure than this.
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL("../../package.json", import.meta.url)),
  ) as { w6w: { network: { allow: string[] } } };
  assertEquals(manifest.w6w.network.allow, ["*.bamboohr.com"]);

  for (const sub of ["acme", "a", "big-company-1"]) {
    const host = new URL(resolveApiUrl({ subdomain: sub })).hostname;
    assert(host.endsWith(`.${BAMBOOHR_DOMAIN}`), `${host} is outside *.bamboohr.com`);
    assert(host !== BAMBOOHR_DOMAIN, "the wildcard does not match the apex");
  }
});

Deno.test("client: normalizeSubdomain reduces every form a user might paste", () => {
  for (
    const raw of [
      "acme",
      "ACME",
      "  acme  ",
      "acme.bamboohr.com",
      "https://acme.bamboohr.com",
      "https://acme.bamboohr.com/api/v1/employees/directory",
      "https://acme.bamboohr.com/?foo=bar",
    ]
  ) {
    assertEquals(normalizeSubdomain(raw), "acme", `failed for ${raw}`);
  }
});

Deno.test("client: a subdomain must be a single DNS label", () => {
  assert(isValidSubdomain("acme"));
  assert(isValidSubdomain("a"));
  assert(isValidSubdomain("big-company-1"));

  assert(!isValidSubdomain(""));
  assert(!isValidSubdomain("-acme"));
  assert(!isValidSubdomain("acme-"));
  assert(!isValidSubdomain("acme_co"));
  // The one that matters: a dotted value would be interpolated into the host.
  assert(!isValidSubdomain("evil.example.com"));
});

Deno.test("client: apiHost rejects what isValidSubdomain rejects, with a usable message", () => {
  assertEquals(apiHost("acme"), "acme.bamboohr.com");
  assertEquals(apiHost("https://acme.bamboohr.com/api/v1"), "acme.bamboohr.com");

  assertThrows(() => apiHost(""), Error, "missing a company domain");
  // `evil.example.com` survives normalization (no bamboohr.com suffix to strip)
  // and must be caught by the label check rather than becoming a hostname.
  assertThrows(() => apiHost("evil.example.com"), Error, "not a BambooHR company domain");
});

Deno.test("client: a request without a Connection fails with a clear message", async () => {
  const { ctx } = mockCtx([], { display: null });
  await assertRejects(
    () => new BambooClient(ctx).request("/employees/1"),
    Error,
    "missing a company domain",
  );
});

// ------------------------------------------------------ Accept: application/json --

Deno.test("client: every request sends Accept: application/json", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await new BambooClient(ctx).request("/employees/1");
  assertEquals(calls[0].headers["accept"], "application/json");
});

/**
 * The load-bearing one. BambooHR returns XML with a 200 status when `Accept` is
 * missing — "Any other value (or omitted) returns XML" — so a call site that
 * forgot the header would not fail, it would return unparseable success. This
 * asserts the guarantee for EVERY action in the app rather than trusting each
 * one to remember, which is the only version of this test worth having.
 */
Deno.test("client: every action in the app sends Accept: application/json", async () => {
  for (const action of app.actions) {
    const { ctx, calls } = mockCtx([{ body: {} }]);
    // Minimal plausible input: every required param gets a value of its type.
    const input: Record<string, unknown> = {};
    for (const p of action.params ?? []) {
      if (!p.required) continue;
      input[p.key] = p.type === "number" ? 1 : p.type === "boolean" ? true : "1";
    }
    await action.execute(input as never, ctx);
    assertEquals(calls.length, 1, `${action.key}: expected exactly one request`);
    assertEquals(
      calls[0].headers["accept"],
      "application/json",
      `${action.key}: missing or wrong Accept header — BambooHR would return XML`,
    );
  }
});

Deno.test("client: every action targets the connection's host under /api/v1", async () => {
  for (const action of app.actions) {
    const { ctx, calls } = mockCtx([{ body: {} }]);
    const input: Record<string, unknown> = {};
    for (const p of action.params ?? []) {
      if (!p.required) continue;
      input[p.key] = p.type === "number" ? 1 : p.type === "boolean" ? true : "1";
    }
    await action.execute(input as never, ctx);
    const url = new URL(calls[0].url);
    assertEquals(
      url.hostname,
      `${TEST_SUBDOMAIN}.${BAMBOOHR_DOMAIN}`,
      `${action.key}: wrong host`,
    );
    assert(
      url.pathname.startsWith("/api/v1/"),
      `${action.key}: ${url.pathname} is not under /api/v1`,
    );
  }
});

Deno.test("client: a caller may override Accept deliberately, but never by omission", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new BambooClient(ctx).request("/x", { headers: { accept: "application/xml" } });
  assertEquals(calls[0].headers["accept"], "application/xml");
});

// ------------------------------------------------------------------- requests --

Deno.test("client: query params are appended, and empty values are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new BambooClient(ctx).request("/employees/1", {
    query: { fields: "firstName", onlyCurrent: false, skip: undefined, blank: "", nil: null },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("fields"), "firstName");
  // `false` is a meaningful value and must survive; only undefined/null/"" go.
  assertEquals(url.searchParams.get("onlyCurrent"), "false");
  assertEquals(url.searchParams.has("skip"), false);
  assertEquals(url.searchParams.has("blank"), false);
  assertEquals(url.searchParams.has("nil"), false);
});

Deno.test("client: a body is JSON-encoded with a content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new BambooClient(ctx).request("/employees", { method: "POST", body: { firstName: "Ava" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { firstName: "Ava" });
});

Deno.test("client: no request carries an Authorization header — that is sign's job", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new BambooClient(ctx).request("/employees/1");
  assertEquals(calls[0].headers["authorization"], undefined);
});

// -------------------------------------------------------------------- errors --

Deno.test("client: an error surfaces BambooHR's X-BambooHR-Error-Message header", async () => {
  // BambooHR puts the human-readable reason in a header, not the body. A 406
  // means "references to non-existent fields", which is unguessable without it.
  const { ctx } = mockCtx([{
    status: 406,
    statusText: "Not Acceptable",
    headers: { "x-bamboohr-error-message": "Invalid field: notAField" },
    body: "",
  }]);
  const err = await assertRejects(() => new BambooClient(ctx).request("/employees/1"), Error);
  assert(err.message.includes("406"), "status missing");
  assert(err.message.includes("Invalid field: notAField"), "error header not surfaced");
});

Deno.test("client: a 204 and an empty body both resolve to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200, body: "" }]);
  assertEquals(await new BambooClient(ctx).request("/x"), undefined);
  assertEquals(await new BambooClient(ctx).request("/x"), undefined);
});

// -------------------------------------------------------------------- helpers --

Deno.test("client: compact drops undefined but keeps null and empty string", () => {
  // An update is a merge, so `undefined` must mean "leave alone" while an
  // explicit null/"" must survive as "clear this".
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "" }), { a: 1, c: null, d: "" });
});

Deno.test("client: withFields merges extras under named params", () => {
  assertEquals(
    withFields({ firstName: "Ava", lastName: undefined }, { division: "West" }),
    { division: "West", firstName: "Ava" },
  );
  // Named params win on collision — the specific statement of intent.
  assertEquals(
    withFields({ firstName: "Ava" }, { firstName: "Bea" }),
    { firstName: "Ava" },
  );
  assertEquals(withFields({ firstName: "Ava" }, undefined), { firstName: "Ava" });
});
