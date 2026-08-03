import { assert, assertEquals } from "@std/assert";
import getTeam from "../../actions/get-team.ts";
import { mockCtx, outputFields, params } from "../_helpers.ts";

Deno.test("get-team: GETs /team and defaults version to v2 to include the members array", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "tea_1" } }]);
  await getTeam.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.lemlist.com/api/team");
  assertEquals(url.searchParams.get("version"), "v2");
});

Deno.test("get-team: is how team members are listed — there is no /team/users route", async () => {
  const body = {
    _id: "tea_1",
    name: "lemlist",
    users: [
      { userId: "usr_1", name: "Ada", email: "ada@example.com", role: "admin" },
      { userId: "usr_2", name: "Grace", email: "grace@example.com", role: "member" },
    ],
  };
  const { ctx } = mockCtx([{ body }]);
  const out = await getTeam.execute!({}, ctx) as typeof body;
  assertEquals(out.users.length, 2);
  assert(outputFields(getTeam).some((o) => o.key === "users"));
});

Deno.test("get-team: is a read action with no required params", () => {
  assertEquals(getTeam.type, "read");
  assertEquals(params(getTeam).filter((p) => p.required).length, 0);
});
