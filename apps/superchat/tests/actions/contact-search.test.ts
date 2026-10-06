import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-search.ts";

const BASE = "https://api.superchat.com/v1.0";

Deno.test("contact-search: POSTs a single `=` expression with the page cursor in the query", async () => {
  const { ctx, calls } = mockCtx([{
    "body": { "results": [{ "id": "c_1" }], "pagination": { "next_cursor": null } },
  }]);
  const result = await action.execute!(
    { "field": "mail", "value": "a@b.co", "limit": 5 } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{
    "method": "POST",
    "path": "/contacts/search",
    "query": { "limit": "5" },
    "body": { "query": { "value": [{ "field": "mail", "operator": "=", "value": "a@b.co" }] } },
  }];
  assertEquals(calls.length, expected.length, "number of requests");
  expected.forEach((want, i) => {
    const url = new URL(calls[i].url);
    assertEquals(url.origin + url.pathname, BASE + want.path);
    assertEquals(calls[i].method, want.method);
    const got: Record<string, string | string[]> = {};
    for (const key of new Set(url.searchParams.keys())) {
      const all = url.searchParams.getAll(key);
      got[key] = all.length > 1 || Array.isArray(want.query?.[key]) ? all : all[0];
    }
    assertEquals(got, want.query ?? {});
    assertEquals(calls[i].body === null ? undefined : JSON.parse(calls[i].body!), want.body);
    assertEquals(calls[i].headers["x-api-key"], undefined, "credentials belong to sign only");
  });
  assertEquals(result, {
    "results": [{ "id": "c_1" }],
    "pagination": { "next_cursor": null },
    "nextCursor": null,
  });
});

Deno.test("contact-search: custom-attribute search uses `identifier`", async () => {
  const { ctx, calls } = mockCtx([{
    "body": { "results": [], "pagination": { "next_cursor": "n" } },
  }]);
  const result = await action.execute!(
    { "field": "custom_attribute", "value": "gold", "attributeId": "ca_1" } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{
    "method": "POST",
    "path": "/contacts/search",
    "body": {
      "query": {
        "value": [{
          "field": "custom_attribute",
          "identifier": "ca_1",
          "operator": "=",
          "value": "gold",
        }],
      },
    },
  }];
  assertEquals(calls.length, expected.length, "number of requests");
  expected.forEach((want, i) => {
    const url = new URL(calls[i].url);
    assertEquals(url.origin + url.pathname, BASE + want.path);
    assertEquals(calls[i].method, want.method);
    const got: Record<string, string | string[]> = {};
    for (const key of new Set(url.searchParams.keys())) {
      const all = url.searchParams.getAll(key);
      got[key] = all.length > 1 || Array.isArray(want.query?.[key]) ? all : all[0];
    }
    assertEquals(got, want.query ?? {});
    assertEquals(calls[i].body === null ? undefined : JSON.parse(calls[i].body!), want.body);
    assertEquals(calls[i].headers["x-api-key"], undefined, "credentials belong to sign only");
  });
  assertEquals(result, { "results": [], "pagination": { "next_cursor": "n" }, "nextCursor": "n" });
});

Deno.test("contact-search: custom-attribute search without an attribute id throws", async () => {
  const { ctx, calls } = mockCtx();
  const err = await assertRejects(
    async () => await action.execute!({ "field": "custom_attribute", "value": "x" } as never, ctx),
    Error,
  );
  assert(err.message.toLowerCase().includes("custom attribute id"), err.message);
  assertEquals(calls.length, 0, "must fail before any request");
});
