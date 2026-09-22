import { assertEquals } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-tasks.ts";

Deno.test("list-tasks: GETs /v1/tasks with the documented filters", async () => {
  const { ctx, calls } = mockCtx([envelope([{ id: 1, title: "Task title" }], { count: 1 })]);
  await action.execute(
    {
      limit: 10,
      offset: 0,
      reservationId: 40160,
      match: "clean",
      status: "pending",
      canStartFromStart: "2023-07-01",
    },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/tasks");
  assertEquals(url.searchParams.get("reservationId"), "40160");
  assertEquals(url.searchParams.get("match"), "clean");
  assertEquals(url.searchParams.get("status"), "pending");
  assertEquals(url.searchParams.get("canStartFromStart"), "2023-07-01");
  assertEquals(url.searchParams.has("shouldEndByEnd"), false);
});

Deno.test("list-tasks: the five documented statuses are the only selectable ones", () => {
  const status = action.params?.find((p) => p.key === "status");
  assertEquals(
    (status?.options as Array<{ value: string }>).map((o) => o.value),
    ["", "pending", "confirmed", "inProgress", "completed", "cancelled"],
  );
});
