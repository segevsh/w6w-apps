import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/zone-analytics-get.ts";

Deno.test("zone-analytics-get: POSTs a GraphQL query to /graphql", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        data: {
          viewer: {
            zones: [{
              httpRequests1hGroups: [{
                sum: {
                  requests: 100,
                  bytes: 2000,
                  cachedRequests: 60,
                  cachedBytes: 1500,
                  threats: 3,
                },
              }],
            }],
          },
        },
      },
    },
  ]);
  const result = await action.execute!(
    { zoneId: "z1", since: "2026-07-31T00:00:00Z", until: "2026-08-01T00:00:00Z" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.cloudflare.com/client/v4/graphql");
  assertEquals(calls[0].headers["content-type"], "application/json");
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.variables.zoneTag, "z1");
  assertEquals(body.variables.since, "2026-07-31T00:00:00Z");
  assertEquals(body.variables.until, "2026-08-01T00:00:00Z");

  assertEquals(result, {
    requests: 100,
    bytes: 2000,
    cachedRequests: 60,
    cachedBytes: 1500,
    threats: 3,
    since: "2026-07-31T00:00:00Z",
    until: "2026-08-01T00:00:00Z",
  });
});

Deno.test("zone-analytics-get: empty result set returns zeroed totals", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { data: { viewer: { zones: [{ httpRequests1hGroups: [] }] } } } },
  ]);
  const result = await action.execute!(
    { zoneId: "z1", since: "2026-07-31T00:00:00Z", until: "2026-08-01T00:00:00Z" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.requests, 0);
});

Deno.test("zone-analytics-get: missing zoneId rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ zoneId: "" }, ctx),
    Error,
    "`zoneId`",
  );
});

Deno.test("zone-analytics-get: GraphQL errors propagate", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { errors: [{ message: "invalid zoneTag" }] } },
  ]);
  await assertRejects(
    async () => await action.execute!({ zoneId: "bad" }, ctx),
    Error,
    "invalid zoneTag",
  );
});
