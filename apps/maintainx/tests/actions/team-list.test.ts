import { assertEquals } from "@std/assert";
import teamList from "../../actions/team-list.ts";
import { mockCtx, pathOf, queryAll } from "../_helpers.ts";

Deno.test("team-list: GET /v1/teams with paging, returns { teams, nextCursor }", async () => {
  const { ctx, calls } = mockCtx([{
    body: { teams: [{ id: 1, name: "n" }], nextCursor: "c", nextPageUrl: "u" },
  }]);
  const out = await teamList.execute({ limit: 25, cursor: "p1", organizationId: 2 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/teams");
  assertEquals(queryAll(calls[0].url), { limit: ["25"], cursor: ["p1"] });
  assertEquals(calls[0].headers["x-organization-id"], "2");
  assertEquals(out, { teams: [{ id: 1, name: "n" }], nextCursor: "c" });
});
