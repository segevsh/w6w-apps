import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/page-child-list.ts";

const display = { site: "acme" };

Deno.test("page-child-list: lists the children of one page", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [{ id: "2" }], _links: {} } }], {
    display,
  });
  const result = await action.execute!({ pageId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/wiki/api/v2/pages/1/children");
  assertEquals(result, [{ id: "2" }]);
});

Deno.test("page-child-list: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`pageId` is required");
  assertEquals(calls.length, 0);
});
