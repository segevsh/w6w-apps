import { assert, assertEquals, assertRejects } from "@std/assert";
import cancelGroupSchedule from "../../actions/cancel-group-schedule.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {
  "groupId": "G4V1",
};
const run = (
  ctx: Parameters<typeof cancelGroupSchedule.execute>[1],
  input: Record<string, unknown> = sample,
) => cancelGroupSchedule.execute(input as never, ctx) as Promise<unknown>;

Deno.test("cancel-group-schedule: declares a perform action with a description, params and output", () => {
  assertEquals(cancelGroupSchedule.key, "cancel-group-schedule");
  assertEquals(cancelGroupSchedule.type, "perform");
  assert((cancelGroupSchedule.description ?? "").length > 0);
  assert(Array.isArray(cancelGroupSchedule.output) && cancelGroupSchedule.output.length > 0);
  assertEquals(cancelGroupSchedule.idempotent, false);
});

Deno.test("cancel-group-schedule: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "groupId": "G4V1",
      "status": "PENDING",
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "groupId": "G4V1",
    "status": "PENDING",
    "scheduledDate": null,
    "count": null,
    "group": {
      "groupId": "G4V1",
      "status": "PENDING",
    },
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/messages/v4/groups/G4V1/schedule");
  assertEquals(calls[0].url.startsWith("https://api.solapi.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("cancel-group-schedule: a SOLAPI error body is thrown with its code and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("Unauthorized", "no permission") }]);
  await assertRejects(() => run(ctx), Error, "SOLAPI 401: Unauthorized: no permission");
});
