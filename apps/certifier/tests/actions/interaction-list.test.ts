import { assertEquals } from "@std/assert";
import action from "../../actions/interaction-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("interaction-list: GET /v1/credential-interactions filtered by credentialId", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "i1" }]) }]);
  const out = await action.execute({ credentialId: " c1 ", limit: 5 }, ctx) as { data: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/credential-interactions");
  assertEquals(queryOf(calls[0].url), { credentialId: "c1", limit: "5" });
  assertEquals(out.data.length, 1);
});

Deno.test("interaction-list: with no filter it reads the whole workspace", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
