import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/user-search.ts";

/** One person can be several Amplitude ids — one per device before signing in. */
Deno.test("user-search: returns every match, because more than one is normal", async () => {
  const { ctx, calls } = mockCtx([
    ok({
      matches: [
        { amplitude_id: 111, user_id: "user-1071" },
        { amplitude_id: 222, user_id: "user-1071" },
      ],
      type: "user_id",
    }),
  ], { display });
  const result = await action.execute!({ user: "user-1071" }, ctx) as {
    count: number;
    type: string;
    amplitudeIds: number[];
  };
  assertEquals(new URL(calls[0].url).pathname, "/api/2/usersearch");
  assertEquals(result.count, 2);
  assertEquals(result.type, "user_id");
  assertEquals(result.amplitudeIds, [111, 222]);
});

/** The type says which kind of identifier matched. */
Deno.test("user-search: reports which identifier kind matched", async () => {
  const { ctx } = mockCtx([ok({ matches: [{ amplitude_id: 1 }], type: "device_id" })], { display });
  const result = await action.execute!({ user: "abc-device" }, ctx) as { type: string };
  assertEquals(result.type, "device_id");
});

Deno.test("user-search: no match is a count of zero", async () => {
  const { ctx } = mockCtx([ok({ matches: [] })], { display });
  const result = await action.execute!({ user: "nobody" }, ctx) as { count: number };
  assertEquals(result.count, 0);
});

Deno.test("user-search: needs an identifier", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`user` is required");
  assertEquals(calls.length, 0);
});

/** The identifier is somebody's id. */
Deno.test("user-search: logs the count, never the identifier", async () => {
  const { ctx, logs } = mockCtx([ok({ matches: [], type: "user_id" })], { display });
  await action.execute!({ user: "ada@example.com" }, ctx);
  assert(!JSON.stringify(logs).includes("ada@"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 0, type: "user_id" });
});

Deno.test("user-search: warns that taking the first match loses history", () => {
  assert(/taking the first loses the rest/.test(action.description!), action.description);
});
