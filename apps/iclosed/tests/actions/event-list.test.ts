import { assertEquals } from "@std/assert";
import eventList from "../../actions/event-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("event-list: sends every input as query", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await eventList.execute(
    {
      "limit": 7,
      "page": 7,
      "search": "x-search",
      "userId": 7,
      "eventType": "STRATEGY_EVENT",
      "latestFirst": "true",
      "sort": "asc",
      "showFeatureStatuses": "true",
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/events");
  assertEquals(queryOf(calls[0].url), {
    "limit": "7",
    "page": "7",
    "search": "x-search",
    "userId": "7",
    "eventType": "STRATEGY_EVENT",
    "latestFirst": "true",
    "sort": "asc",
    "showFeatureStatuses": "true",
  });
  assertEquals(out, REPLY);
});

Deno.test("event-list: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await eventList.execute({} as never, ctx);

  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("event-list: declares a read-only shape", () => {
  assertEquals(eventList.type, "read");
  assertEquals(eventList.idempotent, undefined);
  assertEquals(eventList.params!.filter((p) => p.required).map((p) => p.key), []);
});
