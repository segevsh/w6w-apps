import { assertEquals } from "@std/assert";
import timeOffListForUser from "../../actions/time-off-list-for-user.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("time-off-list-for-user: calls GET /TimeOff/get/{USER_NAME}", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ start: "2026-09-01", end: "2026-09-02", userName: "Sam" }],
  }]);
  const out = await timeOffListForUser.execute({ userName: "Sam" }, ctx);

  assertEquals(pathOf(calls[0].url), "/TimeOff/get/Sam");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.items.length, 1);
});

/**
 * This endpoint is addressed by NAME, not id — so a name with a space or slash
 * has to be escaped rather than split the path.
 */
Deno.test("time-off-list-for-user: escapes the user name", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await timeOffListForUser.execute({ userName: "Sam Smith" }, ctx);
  assertEquals(pathOf(calls[0].url), "/TimeOff/get/Sam%20Smith");
});

Deno.test("time-off-list-for-user: the name param is required", () => {
  assertEquals(timeOffListForUser.params?.find((p) => p.key === "userName")?.required, true);
});
