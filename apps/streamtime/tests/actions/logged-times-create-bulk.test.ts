import { assertEquals } from "@std/assert";
import loggedTimesCreateBulk from "../../actions/logged-times-create-bulk.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("logged-times-create-bulk: wraps the array under `loggedTimes`", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }, { id: 2 }] }]);
  const entries = [
    { date: "2025-08-14", minutes: 60, jobId: 90 },
    { date: "2025-08-15", minutes: 90, jobId: 90 },
  ];
  const result = await loggedTimesCreateBulk.execute({ loggedTimes: entries }, ctx) as {
    loggedTimes: unknown[];
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/logged_times/bulk");
  assertEquals(bodyOf(calls[0]), { loggedTimes: entries });
  assertEquals(result.loggedTimes.length, 2);
});

/** The entries come back in the documented order, so a batch can be correlated. */
Deno.test("logged-times-create-bulk: the created ids are returned in order", async () => {
  const { ctx } = mockCtx([{ body: [{ id: 1 }, { id: 2 }] }]);
  const result = await loggedTimesCreateBulk.execute({ loggedTimes: [{ minutes: 60 }] }, ctx) as {
    loggedTimes: Array<{ id: number }>;
  };
  assertEquals(result.loggedTimes.map((e) => e.id), [1, 2]);
});

Deno.test("logged-times-create-bulk: a non-array is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await loggedTimesCreateBulk.execute({ loggedTimes: "nope" as unknown as unknown[] }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message, "loggedTimes must be an array of LoggedTime objects");
  assertEquals(calls.length, 0);
});
