import { assertEquals } from "@std/assert";
import action from "../../actions/list-excluded-domains.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-excluded-domains: sends the filters as a query string", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{ "id": 1, "domain": "competitor.com" }],
      "current_page": 2,
      "per_page": 15,
      "total": 150,
    },
  }]);
  const out = await action.execute!({ "list_id": 1, "per_page": 15, "page": 2 } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/intellimatch/domains");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    "list_id": "1",
    "per_page": "15",
    "page": "2",
  });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, {
    "data": [{ "id": 1, "domain": "competitor.com" }],
    "current_page": 2,
    "per_page": 15,
    "total": 150,
  });
});

Deno.test("list-excluded-domains: sends no query string when no filter is set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "data": [] } }]);
  const out = await action.execute!({} as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/intellimatch/domains");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "data": [] });
});
