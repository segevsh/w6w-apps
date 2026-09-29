import { assertEquals } from "@std/assert";
import teamList from "../../actions/team-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("team-list: fetches /teams with no params", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 2, name: "Test Team" }]) }]);
  const out = await teamList.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/public/teams");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals((out as { total: number }).total, 1);
});

Deno.test("team-list: declares no params — the vendor documents none for this operation", () => {
  assertEquals(teamList.params, []);
});
