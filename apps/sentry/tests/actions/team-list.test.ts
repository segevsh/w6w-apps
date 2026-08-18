import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/team-list.ts";

const display = { organizationSlug: "acme" };

Deno.test("team-list: lists teams, detailed by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ slug: "platform" }] }], { display });
  const result = await action.execute!({ query: "plat" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/0/organizations/acme/teams/");
  assertEquals(url.searchParams.get("detailed"), "1");
  assertEquals(url.searchParams.get("query"), "plat");
  assertEquals(result, [{ slug: "platform" }]);
});

Deno.test('team-list: detailed off sends Sentry\'s "0", not false', async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], { display });
  await action.execute!({ detailed: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("detailed"), "0");
});
