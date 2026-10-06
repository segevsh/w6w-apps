import { assertEquals } from "@std/assert";
import action from "../../actions/list-templates.ts";
import { exec, mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-templates: GETs /v1/templates and forwards domain_id/page/limit", async () => {
  const body = page([{ id: "t1", name: "Welcome" }]);
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await exec(action, { domainId: "d1", page: 1, limit: 25 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/templates");
  assertEquals(queryOf(calls[0].url), { domain_id: "d1", page: "1", limit: "25" });
  assertEquals(out, body);
});
