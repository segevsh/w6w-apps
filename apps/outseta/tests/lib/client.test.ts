import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  apiHost,
  asObject,
  buildBody,
  compact,
  describeFailure,
  filterQuery,
  normalizeSubdomain,
  OutsetaClient,
  pageQuery,
  resolveApiUrl,
} from "../../lib/client.ts";
import { connected, mockCtx } from "../_helpers.ts";

Deno.test("normalizeSubdomain: accepts bare names, hosts and pasted URLs", () => {
  for (
    const raw of [
      "acme",
      " ACME ",
      "acme.outseta.com",
      "https://acme.outseta.com",
      "https://acme.outseta.com/api/v1/crm/people?x=1",
    ]
  ) assertEquals(normalizeSubdomain(raw), "acme");
});

Deno.test("apiHost: rejects empty and multi-label input, so the host stays under outseta.com", () => {
  assertEquals(apiHost("acme"), "acme.outseta.com");
  assertThrows(() => apiHost(""));
  assertThrows(() => apiHost("evil.example.com"));
  assertThrows(() => apiHost("a b"));
});

Deno.test("resolveApiUrl: needs a connection subdomain", () => {
  assertEquals(resolveApiUrl({ subdomain: "acme" }), "https://acme.outseta.com/api/v1");
  assertThrows(() => resolveApiUrl(undefined));
});

Deno.test("compact: drops undefined, null and empty strings but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0 }), { d: false, e: 0 });
});

Deno.test("asObject: parses a JSON string, passes an object, rejects arrays and junk", () => {
  assertEquals(asObject('{"a":1}', "x"), { a: 1 });
  assertEquals(asObject({ a: 1 }, "x"), { a: 1 });
  assertEquals(asObject("", "x"), undefined);
  assertThrows(() => asObject("[1]", "x"), Error, "must be a JSON object");
  assertThrows(() => asObject("{nope", "x"), Error, "not valid JSON");
});

Deno.test("buildBody: typed fields win over free-form properties", () => {
  assertEquals(buildBody({ Name: "typed", Empty: "" }, { Name: "free", Custom: 1 }), {
    Name: "typed",
    Custom: 1,
  });
});

Deno.test("filterQuery: passes property filters, refuses paging names and nested values", () => {
  assertEquals(filterQuery({ AccountStage: 3, Created__gt: "2026-01-01", X: null }), {
    AccountStage: 3,
    Created__gt: "2026-01-01",
  });
  assertThrows(() => filterQuery({ limit: 5 }), Error, "dedicated parameter");
  assertThrows(() => filterQuery({ OrderBy: "x" }), Error, "dedicated parameter");
  assertThrows(() => filterQuery({ A: { b: 1 } }), Error, "must be a string");
});

Deno.test("pageQuery: explicit paging wins over filters and unset values vanish", () => {
  assertEquals(pageQuery({ limit: 10, offset: 0, filters: { Email: "a@b.c" } }), {
    Email: "a@b.c",
    limit: 10,
    offset: 0,
    fields: undefined,
    orderBy: undefined,
  });
});

Deno.test("request: sends JSON bodies, skips empty query values, never sets authorization", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { ok: 1 } }]);
  const client = OutsetaClient.fromConnection(connected(ctx));
  await client.request("/crm/people", {
    query: { q: "a b", skip: "", n: undefined },
    body: { A: 1 },
  });
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.searchParams.get("q"), "a b");
  assertEquals(url.searchParams.has("skip"), false);
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, '{"A":1}');
});

Deno.test("request: an empty 200 is undefined; a non-JSON 200 is wrapped; HTML is refused", async () => {
  const empty = mockCtx([{ status: 200 }]);
  assertEquals(
    await OutsetaClient.fromConnection(connected(empty.ctx)).request("/x"),
    undefined,
  );
  const octet = mockCtx([{
    status: 200,
    body: "done",
    headers: { "content-type": "application/octet-stream" },
  }]);
  assertEquals(await OutsetaClient.fromConnection(connected(octet.ctx)).request("/x"), {
    raw: "done",
  });
  const html = mockCtx([{ status: 200, body: "<html>", headers: { "content-type": "text/html" } }]);
  let threw = false;
  try {
    await OutsetaClient.fromConnection(connected(html.ctx)).request("/x");
  } catch (e) {
    threw = (e as Error).message.includes("HTML");
  }
  assert(threw);
});

Deno.test("describeFailure: uses the vendor's ErrorMessage, else names the likely cause", () => {
  assert(
    describeFailure(
      400,
      "POST",
      "/api/v1/crm/people",
      '{"ErrorMessage":"Invalid company email","PropertyName":"Email"}',
    )
      .includes("Invalid company email"),
  );
  assert(describeFailure(403, "GET", "/p", "").includes("rejected"));
  assert(describeFailure(404, "GET", "/p", "").includes("subdomain"));
  assert(describeFailure(429, "GET", "/p", "").includes("4 requests/second"));
  assert(describeFailure(403, "GET", "/p", "<!DOCTYPE html>", "text/html").includes("HTML"));
  assert(describeFailure(500, "GET", "/p", "boom").includes("boom"));
});
