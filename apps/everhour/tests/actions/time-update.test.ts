import { assertEquals, assertRejects } from "@std/assert";
import timeUpdate from "../../actions/time-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("time-update: PUT /time/{timeId} with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await timeUpdate.execute(
    { "timeId": 8006001, "time": 1800, "date": "2018-01-20" },
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/time/8006001");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "time": 1800,
    "date": "2018-01-20",
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("time-update: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        timeUpdate.execute({ "timeId": 8006001, "time": 1800, "date": "2018-01-20" }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("time-update: declares perform and idempotent=true", () => {
  assertEquals(timeUpdate.type, "perform");
  assertEquals(timeUpdate.idempotent, true);
});
