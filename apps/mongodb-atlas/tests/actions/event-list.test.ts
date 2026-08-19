import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/event-list.ts";

const page = {
  status: 200,
  body: {
    results: [
      { eventTypeName: "CLUSTER_DELETED", created: "2026-08-18T12:00:00Z", username: "svc" },
      { eventTypeName: "JOINED_GROUP", created: "2026-08-17T09:00:00Z", username: "alice" },
    ],
    totalCount: 2,
  },
};

Deno.test("event-list: reads the project's events", async () => {
  const { ctx, calls } = mockCtx([page]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/atlas/v2/groups/5f8d0d55b54eff0f2b2c3d4e/events",
  );
  assertEquals(result.count, 2);
  assertEquals(result.totalCount, 2);
});

/** Without a window, page one is the last few minutes. */
Deno.test("event-list: passes the type filter and the date window", async () => {
  const { ctx, calls } = mockCtx([page]);
  await action.execute({
    projectId: "5f8d0d55b54eff0f2b2c3d4e",
    eventTypes: "CLUSTER_DELETED, JOINED_GROUP",
    minDate: "2026-08-01T00:00:00Z",
    maxDate: "2026-08-19T00:00:00Z",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("eventType"), "CLUSTER_DELETED,JOINED_GROUP");
  assertEquals(url.searchParams.get("minDate"), "2026-08-01T00:00:00Z");
  assertEquals(url.searchParams.get("maxDate"), "2026-08-19T00:00:00Z");
});

Deno.test("event-list: newest first, so latest is the first entry", async () => {
  const { ctx } = mockCtx([page]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals((result.latest as Record<string, unknown>).eventTypeName, "CLUSTER_DELETED");
  assertEquals(result.eventTypes, ["CLUSTER_DELETED", "JOINED_GROUP"]);
});

/** The events themselves name people and clusters; the log records a count. */
Deno.test("event-list: logs only how many, not who did what", async () => {
  const { ctx, logs } = mockCtx([page]);
  await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx);
  assertEquals(logs[0].data, { count: 2 });
  assertEquals(JSON.stringify(logs[0]).includes("alice"), false);
});

/** One service account per automation is what makes this readable later. */
Deno.test("event-list: says automated changes are attributed to the service account", () => {
  assert(/attributed to the SERVICE ACCOUNT/.test(action.description!), action.description);
});

Deno.test("event-list: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([page]);
  await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e", eventTypes: "", minDate: "" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("eventType"), null);
  assertEquals(url.searchParams.get("minDate"), null);
});
