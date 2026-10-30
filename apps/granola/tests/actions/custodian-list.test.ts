import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import custodianList from "../../actions/custodian-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("custodian-list: GET with paging", async () => {
  const page = { custodians: [{ id: "lhc_x", removed_at: null }], hasMore: false, cursor: null };
  const { ctx, calls } = mockCtx([{ body: page }]);
  assertEquals(
    await custodianList.execute({ holdId: "lgh_x", cursor: "c", pageSize: 7 }, ctx),
    page,
  );
  assertEquals(pathOf(calls[0].url), "/v1/legal-holds/lgh_x/custodians");
  assertEquals(queryOf(calls[0].url), { cursor: "c", page_size: "7" });
});

test("custodian-list: 404 surfaces", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { code: "NOT_FOUND", message: "none" } }]);
  await assertRejects(
    async () => await custodianList.execute({ holdId: "lgh_x" }, ctx),
    Error,
    "404",
  );
});
