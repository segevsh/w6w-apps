import { assertEquals, assertRejects } from "@std/assert";
import legalHoldList from "../../actions/legal-hold-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("legal-hold-list: GET /v1/legal-holds with paging", async () => {
  const page = { legal_holds: [], hasMore: false, cursor: null };
  const { ctx, calls } = mockCtx([{ body: page }]);
  assertEquals(await legalHoldList.execute({ cursor: "c", pageSize: 20 }, ctx), page);
  assertEquals(pathOf(calls[0].url), "/v1/legal-holds");
  assertEquals(queryOf(calls[0].url), { cursor: "c", page_size: "20" });
});

Deno.test("legal-hold-list: 401 surfaces", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { code: "INVALID_API_KEY", message: "x" } }]);
  await assertRejects(async () => await legalHoldList.execute({}, ctx), Error, "401");
});
