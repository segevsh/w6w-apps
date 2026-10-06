import { assertEquals } from "@std/assert";
import action from "../../actions/list-recipients.ts";
import { exec, mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-recipients: GETs /v1/recipients with domain_id/page/limit", async () => {
  const body = page([{ id: "r1", email: "a@x.com" }]);
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await exec(action, { domainId: "d1", page: 2, limit: 30 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/recipients");
  assertEquals(queryOf(calls[0].url), { domain_id: "d1", page: "2", limit: "30" });
  assertEquals(out, body);
});
