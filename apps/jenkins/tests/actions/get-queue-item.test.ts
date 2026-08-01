import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-queue-item.ts";

const display = { endpoint: "https://ci.example.com" };

Deno.test("get-queue-item: GETs /queue/item/<id>/api/json", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: 1543, blocked: false, buildable: true, cancelled: false, why: null } },
  ], { display });
  const result = await action.execute({ queueId: 1543 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/queue/item/1543/api/json");
  assertEquals(result, { id: 1543, blocked: false, buildable: true, cancelled: false, why: null });
});

Deno.test("get-queue-item: reports the resolved build once Jenkins schedules an executor", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        id: 1543,
        blocked: false,
        buildable: false,
        cancelled: false,
        executable: { number: 99, url: "https://ci.example.com/job/my-job/99/" },
      },
    },
  ], { display });
  const result = await action.execute({ queueId: 1543 }, ctx) as {
    executable?: { number: number };
  };
  assertEquals(result.executable?.number, 99);
});
