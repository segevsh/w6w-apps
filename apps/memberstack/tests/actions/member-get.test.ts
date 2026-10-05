import { assertEquals } from "@std/assert";
import memberGet from "../../actions/member-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("member-get: URL-encodes an email into the path", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "mem_1" } } }]);
  const out = await memberGet.execute({ idOrEmail: "a+b@example.com" }, ctx) as {
    found: boolean;
  };
  assertEquals(pathOf(calls[0].url), "/members/a%2Bb%40example.com");
  assertEquals(out.found, true);
});

Deno.test("member-get: data null (200) is found:false, not an error", async () => {
  const { ctx } = mockCtx([{ body: { data: null } }]);
  assertEquals(await memberGet.execute({ idOrEmail: "mem_x" }, ctx), {
    found: false,
    member: null,
  });
});

Deno.test("member-get: includeTeams sends include=teams", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "mem_1", teams: [] } } }]);
  await memberGet.execute({ idOrEmail: "mem_1", includeTeams: true }, ctx);
  assertEquals(queryOf(calls[0].url), { include: "teams" });
});
