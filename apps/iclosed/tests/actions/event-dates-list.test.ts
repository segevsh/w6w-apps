import { assertEquals } from "@std/assert";
import eventDatesList from "../../actions/event-dates-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("event-dates-list: sends every input as body", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await eventDatesList.execute(
    {
      "linkPrefix": "x-linkPrefix",
      "timeZone": "x-timeZone",
      "currentDate": "x-currentDate",
      "conditionalUsers": "x-conditionalUsers",
      "routingGroupIds": "x-routingGroupIds",
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/events/eventDates");
  assertEquals(JSON.parse(calls[0].body!), {
    "linkPrefix": "x-linkPrefix",
    "timeZone": "x-timeZone",
    "currentDate": "x-currentDate",
    "conditionalUsers": "x-conditionalUsers",
    "routingGroupIds": "x-routingGroupIds",
  });
  assertEquals(out, REPLY);
});

Deno.test("event-dates-list: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await eventDatesList.execute({ "linkPrefix": "x-linkPrefix" } as never, ctx);

  assertEquals(JSON.parse(calls[0].body!), { "linkPrefix": "x-linkPrefix" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("event-dates-list: declares a read-only shape", () => {
  assertEquals(eventDatesList.type, "search");
  assertEquals(eventDatesList.idempotent, undefined);
  assertEquals(eventDatesList.params!.filter((p) => p.required).map((p) => p.key), ["linkPrefix"]);
});
