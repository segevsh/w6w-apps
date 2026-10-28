import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  compact,
  ConfluenceClient,
  contentBody,
  csv,
  cursorFromNext,
  hostFromConnection,
} from "../../lib/client.ts";

const page = (results: unknown[], next?: string) => ({
  results,
  _links: next ? { next } : {},
});

Deno.test("hostFromConnection: an API-token connection talks to the site host", () => {
  assertEquals(
    hostFromConnection({ display: { site: "acme" } } as never),
    "https://acme.atlassian.net",
  );
});

Deno.test("hostFromConnection: an OAuth connection talks to the gateway, and wins", () => {
  // An OAuth connection has a cloud id and no usable site host, so the cloud
  // id is checked first — the same precedence the jira app uses.
  assertEquals(
    hostFromConnection({ display: { cloudId: "abc-123", site: "acme" } } as never),
    "https://api.atlassian.com/ex/confluence/abc-123",
  );
});

Deno.test("hostFromConnection: neither one is a directive error, not a bad URL", () => {
  const err = assertThrows(() => hostFromConnection({ display: {} } as never), Error);
  assert(err.message.includes("reconnect"), err.message);
});

Deno.test("compact: drops unset keys but keeps false and zero", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
});

Deno.test("csv: splits, trims and drops blanks; blank input stays unset", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(7), undefined);
});

Deno.test("contentBody: wraps a string, defaulting to Confluence's own storage format", () => {
  assertEquals(contentBody("hello"), { representation: "storage", value: "hello" });
  assertEquals(contentBody("hi", "wiki"), { representation: "wiki", value: "hi" });
  assertEquals(contentBody(""), undefined);
  assertEquals(contentBody(undefined), undefined);
});

Deno.test("cursorFromNext: extracts the cursor out of the relative next URL", () => {
  // Extracted rather than followed: the relative URL is written for the site
  // host, and an OAuth connection talks to the gateway instead.
  assertEquals(
    cursorFromNext("/wiki/api/v2/pages?limit=100&cursor=opaque-token-1"),
    "opaque-token-1",
  );
  assertEquals(cursorFromNext(undefined), undefined);
  assertEquals(cursorFromNext("/wiki/api/v2/pages"), undefined);
});

Deno.test("client: v2 and v1 requests use their own base paths on the same host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }, { status: 200, body: {} }], {
    display: { site: "acme" },
  });
  const client = new ConfluenceClient(ctx);
  await client.request("/pages/1");
  await client.requestV1("/user/current");
  assertEquals(calls[0].url, "https://acme.atlassian.net/wiki/api/v2/pages/1");
  assertEquals(calls[1].url, "https://acme.atlassian.net/wiki/rest/api/user/current");
});

Deno.test("client: an OAuth connection routes both bases through the gateway", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: { cloudId: "cid" } });
  await new ConfluenceClient(ctx).requestV1("/user/current");
  assertEquals(
    calls[0].url,
    "https://api.atlassian.com/ex/confluence/cid/wiki/rest/api/user/current",
  );
});

Deno.test("client: never sends an Authorization header — signing is the host's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: { site: "acme" } });
  await new ConfluenceClient(ctx).request("/pages");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("client: array query values repeat the key, and blanks are dropped", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: { site: "acme" } });
  await new ConfluenceClient(ctx).request("/pages", {
    query: { "space-id": ["1", "2"], title: "", status: "current" },
  });
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.getAll("space-id"), ["1", "2"]);
  assertEquals(q.get("title"), null);
  assertEquals(q.get("status"), "current");
});

Deno.test("client: a failure surfaces the status and Confluence's own error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { errors: [{ status: 404, code: "NOT_FOUND", title: "No such page" }] },
  }], { display: { site: "acme" } });
  const err = await assertRejects(
    async () => await new ConfluenceClient(ctx).request("/pages/9"),
    Error,
  );
  assert(err.message.includes("404"), err.message);
  assert(err.message.includes("No such page"), err.message);
});

Deno.test("client: 204 and an empty body both come back as undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200, body: "" }], {
    display: { site: "acme" },
  });
  const client = new ConfluenceClient(ctx);
  assertEquals(await client.request("/pages/1", { method: "DELETE" }), undefined);
  assertEquals(await client.request("/pages/1"), undefined);
});

Deno.test("client: requestAll follows _links.next until it is absent", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: page([{ id: "1" }], "/wiki/api/v2/pages?cursor=c2") },
    { status: 200, body: page([{ id: "2" }]) },
  ], { display: { site: "acme" } });

  const items = await new ConfluenceClient(ctx).requestAll("/pages");
  assertEquals(items, [{ id: "1" }, { id: "2" }]);
  assertEquals(new URL(calls[0].url).searchParams.get("cursor"), null);
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "100");
  assertEquals(new URL(calls[1].url).searchParams.get("cursor"), "c2");
});

Deno.test("client: requestAll stops at wantTotal even with a next page waiting", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: page([{ id: "1" }, { id: "2" }, { id: "3" }], "/wiki/api/v2/pages?cursor=c2"),
    },
  ], { display: { site: "acme" } });
  const items = await new ConfluenceClient(ctx).requestAll("/pages", {}, 2);
  assertEquals(items, [{ id: "1" }, { id: "2" }]);
  assertEquals(calls.length, 1);
});
