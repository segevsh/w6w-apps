import { assertEquals } from "@std/assert";
import action from "../../actions/list-messages.ts";
import { exec, mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-messages: GETs /v1/messages with domain_id, page and limit", async () => {
  const body = page([{ id: "m1" }]);
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await exec(action, { domainId: "d1", page: 2, limit: 10 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/messages");
  assertEquals(queryOf(calls[0].url), { domain_id: "d1", page: "2", limit: "10" });
  assertEquals(out, body);
});

Deno.test("list-messages: sends nothing when no filter is given", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await exec(action, {}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
