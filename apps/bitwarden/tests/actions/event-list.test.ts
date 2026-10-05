import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/event-list.ts";

const D = { display: { region: "us" } };

Deno.test("event-list: sends filters as query params", async () => {
  const { ctx, calls } = mockCtx([{
    body: { object: "list", data: [{ object: "event", type: 1000 }] },
  }], D);
  const result = await action.execute({
    start: "2026-10-01T00:00:00Z",
    end: "2026-10-02T00:00:00Z",
    actingUserId: "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b",
  }, ctx) as Record<string, unknown>;
  const u = new URL(calls[0].url);
  assertEquals(u.pathname, "/public/events");
  assertEquals(u.searchParams.get("start"), "2026-10-01T00:00:00.000Z");
  assertEquals(u.searchParams.get("actingUserId"), "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b");
  assertEquals(result.count, 1);
  assertEquals(result.hasMore, false);
});

Deno.test("event-list: follows the continuation token up to maxPages", async () => {
  const { ctx, calls } = mockCtx([{
    body: { object: "list", data: [{ type: 1 }], continuationToken: "tok1" },
  }, { body: { object: "list", data: [{ type: 2 }] } }], D);
  const result = await action.execute({ maxPages: 3 }, ctx) as Record<string, unknown>;
  assertEquals(calls.length, 2);
  assertEquals(new URL(calls[1].url).searchParams.get("continuationToken"), "tok1");
  assertEquals(result.count, 2);
  assertEquals(result.hasMore, false);
});

Deno.test("event-list: stops at maxPages and hands back the token", async () => {
  const { ctx, calls } = mockCtx([{
    body: { object: "list", data: [{ type: 1 }], continuationToken: "tok1" },
  }], D);
  const result = await action.execute({ maxPages: 1 }, ctx) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(result.continuationToken, "tok1");
  assertEquals(result.hasMore, true);
});
