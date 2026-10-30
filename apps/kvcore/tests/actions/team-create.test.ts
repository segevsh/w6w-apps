import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import teamCreate from "../../actions/team-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("team-create: posts to /team", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 2, name: "Test Team" } }]);
  await teamCreate.execute({ name: "Test Team", visibility: true }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/public/team");
  assertEquals(JSON.parse(calls[0].body!), { name: "Test Team", visibility: 1 });
});

test("team-create: office-only fields are not offered", () => {
  const keys = (teamCreate.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("docusign_office_id"), false);
  assertEquals(keys.includes("about_alt_french"), false);
});
