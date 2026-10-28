import { assertEquals } from "@std/assert";
import teamList from "../../actions/team-list.ts";
import { mockWorkDriveCtx } from "../_helpers.ts";

Deno.test("team-list: explicit ZUID goes straight to /users/{zuid}/teams", async () => {
  const { ctx, calls } = mockWorkDriveCtx([{ body: { data: [{ id: "t1", type: "teams" }] } }]);
  const res = await teamList.execute({ zuid: "123" }, ctx) as { items: unknown[] };
  assertEquals(calls.length, 1);
  assertEquals(new URL(calls[0].url).pathname, "/workdrive/api/v1/users/123/teams");
  assertEquals(res.items.length, 1);
});

Deno.test("team-list: no ZUID reads the caller's id from /users/me first", async () => {
  const { ctx, calls } = mockWorkDriveCtx([
    { body: { data: { id: "747938014", type: "users" } } },
    { body: { data: [{ id: "t1", type: "teams" }] } },
  ]);
  await teamList.execute({}, ctx);
  assertEquals(calls.length, 2);
  assertEquals(new URL(calls[0].url).pathname, "/workdrive/api/v1/users/me");
  assertEquals(new URL(calls[1].url).pathname, "/workdrive/api/v1/users/747938014/teams");
});

Deno.test("team-list: throws when /users/me carries no id", async () => {
  const { ctx } = mockWorkDriveCtx([{ body: { data: {} } }]);
  let threw = false;
  try {
    await teamList.execute({}, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});
