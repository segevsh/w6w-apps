import { assertEquals, assertRejects } from "@std/assert";
import timerStart from "../../actions/timer-start.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("timer-start: POST /timers with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await timerStart.execute({
    "task": "ev:9876543210",
    "userDate": "2018-01-16",
    "comment": "notes",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/timers");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "task": "ev:9876543210",
    "userDate": "2018-01-16",
    "comment": "notes",
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("timer-start: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        timerStart.execute({
          "task": "ev:9876543210",
          "userDate": "2018-01-16",
          "comment": "notes",
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("timer-start: declares perform and idempotent=false", () => {
  assertEquals(timerStart.type, "perform");
  assertEquals(timerStart.idempotent, false);
});
