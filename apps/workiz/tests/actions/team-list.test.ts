import { assertEquals } from "@std/assert";
import teamList from "../../actions/team-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("team-list: calls GET /team/all/ with no query or body", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "u1", name: "Dana", role: "Admin" }] }]);
  const out = await teamList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/team/all/");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  assertEquals(out.items, [{ id: "u1", name: "Dana", role: "Admin" }]);
});

Deno.test("team-list: a null body becomes an empty list, never a crash", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await teamList.execute({}, ctx);
  assertEquals(out.items, []);
});

Deno.test("team-list: declares no params, because the endpoint takes none", () => {
  assertEquals(teamList.params, []);
});
