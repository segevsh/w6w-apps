import { assertEquals } from "@std/assert";
import action from "../../actions/list-sender-identities.ts";
import { exec, mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-sender-identities: GETs /v1/identities with filters and ordering", async () => {
  const body = page([{ id: "i1", email: "a@x.com" }]);
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await exec(action, {
    domainId: "d1",
    query: "a@",
    orderBy: "created_at",
    order: "desc",
    page: 1,
    limit: 10,
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/identities");
  assertEquals(queryOf(calls[0].url), {
    domain_id: "d1",
    query: "a@",
    order_by: "created_at",
    order: "desc",
    page: "1",
    limit: "10",
  });
  assertEquals(out, body);
});
