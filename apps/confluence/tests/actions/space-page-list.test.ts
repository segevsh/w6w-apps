import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/space-page-list.ts";

const display = { site: "acme" };

Deno.test("space-page-list: depth=root is what page-list cannot express", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [{ id: "1" }], _links: {} } }], {
    display,
  });
  const result = await action.execute!({ spaceId: "101", depth: "root" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/wiki/api/v2/spaces/101/pages");
  assertEquals(url.searchParams.get("depth"), "root");
  assertEquals(result, [{ id: "1" }]);
});

Deno.test("space-page-list: a blank space fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`spaceId` is required");
  assertEquals(calls.length, 0);
});
