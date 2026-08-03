import { assertEquals } from "@std/assert";
import getTeamCredits from "../../actions/get-team-credits.ts";
import { mockCtx, params } from "../_helpers.ts";

Deno.test("get-team-credits: GETs /team/credits with no params at all", async () => {
  const { ctx, calls } = mockCtx([{ body: { credits: 100 } }]);
  await getTeamCredits.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.lemlist.com/api/team/credits");
  assertEquals(params(getTeamCredits).length, 0);
  assertEquals(getTeamCredits.type, "read");
});

Deno.test("get-team-credits: returns lemlist's credits envelope unchanged", async () => {
  const body = {
    credits: 100,
    details: { remaining: { total: 100, freemium: 0, subscription: 80, gifted: 10, paid: 10 } },
  };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await getTeamCredits.execute!({}, ctx), body);
});
