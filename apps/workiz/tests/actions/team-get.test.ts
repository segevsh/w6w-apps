import { assertEquals } from "@std/assert";
import teamGet from "../../actions/team-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("team-get: calls GET /team/get/{USER_ID}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", name: "Sam", role: "Tech" } }]);
  const out = await teamGet.execute({ userId: "u1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/team/get/u1");
  assertEquals(out, { id: "u1", name: "Sam", role: "Tech" });
});

/** The id is path-escaped so a pasted `/` or `?` cannot rewrite the path. */
Deno.test("team-get: escapes a hostile id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x" } }]);
  await teamGet.execute({ userId: "1/../all?" }, ctx);
  assertEquals(pathOf(calls[0].url), "/team/get/1%2F..%2Fall%3F");
});

Deno.test("team-get: the id param is required", () => {
  assertEquals(teamGet.params?.find((p) => p.key === "userId")?.required, true);
});
