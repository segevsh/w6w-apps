import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/start-clock.ts";
import { API_ROOT, bodyOf, exec, mockCtx } from "../_helpers.ts";

Deno.test("start-clock: POSTs /v2/clock with the given fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: { running: { id: 11 }, stopped: { id: 10 }, current_time: "t" },
  }]);
  const out = await exec(
    action,
    { customersId: 3, servicesId: "4", text: "work", billable: 1 },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/v2/clock`);
  assertEquals(bodyOf(calls[0]), { customers_id: 3, services_id: 4, billable: 1, text: "work" });
  assertEquals(out.running, { id: 11 });
  assertEquals(out.stopped, { id: 10 });
});

Deno.test("start-clock: required ids are checked locally; a 409 surfaces", async () => {
  const none = mockCtx();
  await assertRejects(() => exec(action, { customersId: 3 }, none.ctx), Error, "servicesId");
  assertEquals(none.calls.length, 0);
  const { ctx } = mockCtx([{
    status: 409,
    body: { errors: [{ type: "Conflict", message: "clock conflict" }] },
  }]);
  await assertRejects(
    () => exec(action, { customersId: 3, servicesId: 4 }, ctx),
    Error,
    "clock conflict",
  );
});
