import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/collection-project-list.ts";

/** JSON:API reads membership through a relationships path. */
test("collection-project-list: uses the relationships path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], links: {} } }], {
    display: { orgId: "org-1" },
  });
  await action.execute!({ collectionId: "c1" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/rest/orgs/org-1/collections/c1/relationships/projects",
  );
});

test("collection-project-list: a blank collection fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: { orgId: "org-1" } });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`collectionId`");
  assertEquals(calls.length, 0);
});
