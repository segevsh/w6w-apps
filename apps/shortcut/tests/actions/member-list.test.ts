import { assertEquals } from "@std/assert";
import memberList from "../../actions/member-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("member-list: calls GET /members with no query when nothing is set", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await memberList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v3/members");
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("member-list: forwards org-public-id and disabled", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await memberList.execute({ orgPublicId: "org-1", disabled: true }, ctx);

  assertEquals(queryOf(calls[0].url), { "org-public-id": "org-1", disabled: "true" });
});
