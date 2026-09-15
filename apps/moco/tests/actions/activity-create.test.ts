import { assertEquals } from "@std/assert";
import { mockMocoCtx } from "../_helpers.ts";
import action from "../../actions/activity-create.ts";

Deno.test("activity-create: POSTs /activities, converting hours to the wire `seconds` field", async () => {
  const { ctx, calls } = mockMocoCtx([{ body: { id: 1, hours: 2.5 } }]);
  const out = await action.execute({
    date: "2024-03-21",
    projectId: 1234567,
    taskId: 125112,
    hours: 2.5,
    description: "Workshop preparation",
  }, ctx);
  assertEquals(calls[0].url, "https://acme.mocoapp.com/api/v1/activities");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.date, "2024-03-21");
  assertEquals(body.project_id, 1234567);
  assertEquals(body.task_id, 125112);
  assertEquals(body.seconds, 9000);
  assertEquals("hours" in body, false);
  assertEquals(out, { id: 1, hours: 2.5 });
});
