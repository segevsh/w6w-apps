import { assertEquals, assertRejects } from "@std/assert";
import entityQuery from "../../actions/entity-query.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://webservices2.autotask.net/atservicesrest/V1.0";
const display = { display: { zone: "2" } };
const run = (a: { execute?: unknown }, input: unknown, ctx: unknown) =>
  (a.execute as (i: unknown, c: unknown) => Promise<Record<string, unknown>>)(input, ctx);

Deno.test("entity-query: POSTs the filter to /{Entity}/query, defaults the cap and match-all", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      items: [{ id: 1, title: "T" }],
      pageDetails: { count: 1, requestCount: 100, nextPageUrl: null },
    },
  }], display);
  const out = await run(entityQuery, { entity: "tickets" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${BASE}/Tickets/query`);
  assertEquals(JSON.parse(calls[0].body!), {
    filter: [{ op: "gte", field: "id", value: 0 }],
    maxRecords: 100,
  });
  assertEquals(out, {
    items: [{ id: 1, title: "T" }],
    count: 1,
    nextPageUrl: undefined,
    hasMore: false,
  });
});

Deno.test("entity-query: passes the caller's filter, includeFields and a capped maxRecords", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [], pageDetails: {} } }], display);
  await run(entityQuery, {
    entity: "Companies",
    filter: '[{"op":"contains","field":"companyName","value":"Acme"}]',
    maxRecords: 9999,
    includeFields: "id, companyName",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    filter: [{ op: "contains", field: "companyName", value: "Acme" }],
    maxRecords: 500,
    includeFields: ["id", "companyName"],
  });
});

Deno.test("entity-query: reports nextPageUrl, and pageUrl follows it with a GET", async () => {
  const next = "https://webservices2.autotask.net/ATServicesRest/V1.0/Tickets/query?paging=2";
  const first = mockCtx([{
    body: { items: [{ id: 1 }], pageDetails: { nextPageUrl: next } },
  }], display);
  const out = await run(entityQuery, { entity: "Tickets" }, first.ctx);
  assertEquals(out.hasMore, true);
  assertEquals(out.nextPageUrl, next);

  const second = mockCtx(
    [{ body: { items: [{ id: 2 }], pageDetails: { nextPageUrl: null } } }],
    display,
  );
  const page = await run(entityQuery, { pageUrl: next }, second.ctx);
  assertEquals(second.calls[0].method, "GET");
  assertEquals(second.calls[0].url, next);
  assertEquals(page.items, [{ id: 2 }]);
});

Deno.test("entity-query: refuses an unknown entity, a webhook entity and a foreign pageUrl before any request", async () => {
  const { ctx, calls } = mockCtx([], display);
  for (const entity of ["Nope", "TicketWebhooks", "CompanyAttachments", "ClientPortalUsers"]) {
    await assertRejects(() => run(entityQuery, { entity }, ctx), Error, "not a queryable");
  }
  await assertRejects(
    () => run(entityQuery, { pageUrl: "https://evil.example/atservicesrest/x" }, ctx),
    Error,
    "pageUrl",
  );
  assertEquals(calls.length, 0);
});

Deno.test("entity-query: strips secrets from rows", async () => {
  const { ctx } = mockCtx(
    [{ body: { items: [{ id: 1, secretKey: "x" }], pageDetails: {} } }],
    display,
  );
  assertEquals((await run(entityQuery, { entity: "Tickets" }, ctx)).items, [{ id: 1 }]);
});
