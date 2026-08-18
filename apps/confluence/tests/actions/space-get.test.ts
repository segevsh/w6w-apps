import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/space-get.ts";

const display = { site: "acme" };

Deno.test("space-get: takes the numeric ID, not the space key", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "101", key: "ENG" } }], { display });
  const result = await action.execute!({ spaceId: "101", includeLabels: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/wiki/api/v2/spaces/101");
  assertEquals(url.searchParams.get("include-labels"), "true");
  assertEquals(result, { id: "101", key: "ENG" });
});

Deno.test("space-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`spaceId` is required");
  assertEquals(calls.length, 0);
});
