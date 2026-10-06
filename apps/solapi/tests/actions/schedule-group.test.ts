import { assert, assertEquals, assertRejects } from "@std/assert";
import scheduleGroup from "../../actions/schedule-group.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {
  "groupId": "G4V1",
  "scheduledDate": "2026-10-07T09:00:00+09:00",
};
const run = (
  ctx: Parameters<typeof scheduleGroup.execute>[1],
  input: Record<string, unknown> = sample,
) => scheduleGroup.execute(input as never, ctx) as Promise<unknown>;

Deno.test("schedule-group: declares a perform action with a description, params and output", () => {
  assertEquals(scheduleGroup.key, "schedule-group");
  assertEquals(scheduleGroup.type, "perform");
  assert((scheduleGroup.description ?? "").length > 0);
  assert(Array.isArray(scheduleGroup.output) && scheduleGroup.output.length > 0);
  assertEquals(scheduleGroup.idempotent, false);
});

Deno.test("schedule-group: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "groupId": "G4V1",
      "status": "SCHEDULED",
      "scheduledDate": "2026-10-07T00:00:00.000Z",
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "groupId": "G4V1",
    "status": "SCHEDULED",
    "scheduledDate": "2026-10-07T00:00:00.000Z",
    "count": null,
    "group": {
      "groupId": "G4V1",
      "status": "SCHEDULED",
      "scheduledDate": "2026-10-07T00:00:00.000Z",
    },
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/messages/v4/groups/G4V1/schedule");
  assertEquals(calls[0].url.startsWith("https://api.solapi.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "scheduledDate": "2026-10-07T09:00:00+09:00",
  });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("schedule-group: a SOLAPI error body is thrown with its code and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("Unauthorized", "no permission") }]);
  await assertRejects(() => run(ctx), Error, "SOLAPI 401: Unauthorized: no permission");
});
