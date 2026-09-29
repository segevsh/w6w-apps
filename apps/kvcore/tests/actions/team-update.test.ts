import { assertEquals } from "@std/assert";
import teamUpdate from "../../actions/team-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("team-update: PUTs to /team/{id} without the id in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 2, name: "Renamed Team" } }]);
  await teamUpdate.execute({ team_id: "2", name: "Renamed Team" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/public/team/2");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { name: "Renamed Team" });
  assertEquals("team_id" in body, false);
});

/** Unlike office-update, the vendor's schema requires `name` even on team update. */
Deno.test("team-update: name is required, unlike office-update", () => {
  const required = (teamUpdate.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required.sort(), ["name", "team_id"]);
});
