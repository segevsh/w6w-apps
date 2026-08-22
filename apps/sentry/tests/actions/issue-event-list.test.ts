import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-event-list.ts";

const display = { organizationSlug: "acme" };

Deno.test("issue-event-list: lists the events under one issue", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ eventID: "abc" }] }], { display });
  const result = await action.execute!({ issueId: "42", full: true, statsPeriod: "24h" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/0/organizations/acme/issues/42/events/");
  assertEquals(url.searchParams.get("full"), "true");
  assertEquals(url.searchParams.get("statsPeriod"), "24h");
  assertEquals(result, [{ eventID: "abc" }]);
});

Deno.test("issue-event-list: `full` is omitted rather than sent as false", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], { display });
  await action.execute!({ issueId: "42" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("full"), null);
});

Deno.test("issue-event-list: a blank issue id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`issueId` is required");
  assertEquals(calls.length, 0);
});
