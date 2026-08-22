import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/activity-list.ts";

const ORG = "11111111-2222-3333-4444-555555555555";
const D = { display: { organizationId: ORG, plane: "control" } };

const activities = {
  status: 200,
  body: {
    result: [
      {
        id: "a-1",
        type: "SERVICE_DELETED",
        actorType: "api_key",
        createdAt: "2026-08-19T10:00:00Z",
      },
      { id: "a-2", type: "SERVICE_CREATED", actorType: "user", createdAt: "2026-08-18T10:00:00Z" },
    ],
  },
};

Deno.test("activity-list: reads the organisation's activity", async () => {
  const { ctx, calls } = mockCtx([activities], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assert(calls[0].url.endsWith("/activities"), calls[0].url);
  assertEquals(result.count, 2);
  assertEquals(result.types, ["SERVICE_CREATED", "SERVICE_DELETED"]);
});

Deno.test("activity-list: the date window is passed through", async () => {
  const { ctx, calls } = mockCtx([activities], D);
  await action.execute({ fromDate: "2026-08-01T00:00:00Z", toDate: "2026-08-19T00:00:00Z" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("from_date"), "2026-08-01T00:00:00Z");
  assertEquals(url.searchParams.get("to_date"), "2026-08-19T00:00:00Z");
});

Deno.test("activity-list: newest first, so latest is the first entry", async () => {
  const { ctx } = mockCtx([activities], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals((result.latest as Record<string, unknown>).type, "SERVICE_DELETED");
  assertEquals(result.actors, ["api_key", "user"]);
});

/** Every automation sharing one key is indistinguishable here. */
Deno.test("activity-list: says actions are attributed to the key", () => {
  assert(/attributed to the KEY/.test(action.description!), action.description);
  assert(/one key per automation/.test(action.description!), action.description);
});

Deno.test("activity-list: logs a count, not who did what", async () => {
  const { ctx, logs } = mockCtx([activities], D);
  await action.execute({}, ctx);
  assertEquals(logs[0].data, { count: 2 });
});
