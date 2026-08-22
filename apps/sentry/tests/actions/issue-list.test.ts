import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-list.ts";

const display = { endpoint: "https://us.sentry.io", organizationSlug: "acme" };

Deno.test("issue-list: uses the connection's org and stops after one page by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "1" }] }], { display });
  const result = await action.execute!({}, ctx);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/0/organizations/acme/issues/");
  assertEquals(url.searchParams.get("per_page"), "100");
  assertEquals(result, [{ id: "1" }]);
});

Deno.test("issue-list: the org param overrides the connection's org", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], { display });
  await action.execute!({ organizationSlug: "beta" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/0/organizations/beta/issues/");
});

Deno.test("issue-list: filters map to Sentry's repeated query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], { display });
  await action.execute!({
    projects: "web, api",
    query: "is:unresolved",
    statsPeriod: "14d",
    environment: "production",
    sort: "freq",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("project"), ["web", "api"]);
  assertEquals(url.searchParams.get("query"), "is:unresolved");
  assertEquals(url.searchParams.get("statsPeriod"), "14d");
  assertEquals(url.searchParams.getAll("environment"), ["production"]);
  assertEquals(url.searchParams.get("sort"), "freq");
});

Deno.test("issue-list: a small limit truncates without a second request", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{ id: "1" }, { id: "2" }],
    headers: { link: '<https://x/?cursor=c>; rel="next"; results="true"; cursor="c"' },
  }], { display });
  assertEquals(await action.execute!({ limit: 1 }, ctx), [{ id: "1" }]);
  assertEquals(calls.length, 1);
});
