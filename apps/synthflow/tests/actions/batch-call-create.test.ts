import { assertEquals } from "@std/assert";
import batchCallCreate from "../../actions/batch-call-create.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("batch-call-create: POST /calls/batch with parsed tasks and window", async () => {
  const { ctx, calls } = mockCtx([{
    body: ok({ batch_call_id: "b1", status: "scheduled", total_task_count: 1 }),
  }]);
  const out = await batchCallCreate.execute(
    {
      name: "Q4",
      model_id: "m1",
      from_phone_number: "+1415",
      tasks: '[{"to_phone_number":"+1650"}]',
      call_time_window: { enable: true },
      trigger_timestamp: 1700000000000,
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/calls/batch");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Q4",
    model_id: "m1",
    from_phone_number: "+1415",
    trigger_timestamp: 1700000000000,
    call_time_window: { enable: true },
    tasks: [{ to_phone_number: "+1650" }],
  });
  assertEquals((out as { batch_call_id: string }).batch_call_id, "b1");
});
