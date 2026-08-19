import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/alert-list.ts";

const page = {
  status: 200,
  body: {
    results: [
      { id: "a1", status: "OPEN", eventTypeName: "HOST_DOWN" },
      { id: "a2", status: "TRACKING", eventTypeName: "OUTSIDE_METRIC_THRESHOLD" },
      { id: "a3", status: "OPEN", eventTypeName: "HOST_DOWN" },
    ],
    totalCount: 3,
  },
};

/** Unfiltered, the list is mostly resolved history. */
Deno.test("alert-list: defaults to OPEN, which Atlas does not", async () => {
  const { ctx, calls } = mockCtx([page]);
  await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("status"), "OPEN");
  assertEquals(action.params!.find((p) => p.key === "status")!.default, "OPEN");
});

Deno.test("alert-list: an explicit status is passed through, and blank asks for all", async () => {
  const closed = mockCtx([page]);
  await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e", status: "CLOSED" }, closed.ctx);
  assertEquals(new URL(closed.calls[0].url).searchParams.get("status"), "CLOSED");

  const all = mockCtx([page]);
  await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e", status: "" }, all.ctx);
  assertEquals(new URL(all.calls[0].url).searchParams.get("status"), null);
});

/** TRACKING means the condition is met and inside its notification delay. */
Deno.test("alert-list: counts open and tracking separately", async () => {
  const { ctx, logs } = mockCtx([page]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.openCount, 2);
  assertEquals(result.trackingCount, 1);
  assertEquals(logs[0].level, "warn");
  assertEquals(logs[0].data, { openCount: 2, trackingCount: 1 });
});

Deno.test("alert-list: the distinct conditions are deduplicated and sorted", async () => {
  const { ctx } = mockCtx([page]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.eventTypes, ["HOST_DOWN", "OUTSIDE_METRIC_THRESHOLD"]);
});

Deno.test("alert-list: nothing open means no warning", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { results: [], totalCount: 0 } }]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.openCount, 0);
  assertEquals(logs.length, 0);
});

Deno.test("alert-list: says what TRACKING means", () => {
  assert(/met and inside its notification delay/.test(action.description!), action.description);
});
