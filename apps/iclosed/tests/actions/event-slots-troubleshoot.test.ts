import { assertEquals } from "@std/assert";
import eventSlotsTroubleshoot from "../../actions/event-slots-troubleshoot.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("event-slots-troubleshoot: sends every input as query", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await eventSlotsTroubleshoot.execute(
    {
      "linkPrefix": "x-linkPrefix",
      "date": "x-date",
      "timezone": "x-timezone",
      "selectedHost": 7,
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/events/troubleshootSlots");
  assertEquals(queryOf(calls[0].url), {
    "linkPrefix": "x-linkPrefix",
    "date": "x-date",
    "timezone": "x-timezone",
    "selectedHost": "7",
  });
  assertEquals(out, REPLY);
});

Deno.test("event-slots-troubleshoot: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await eventSlotsTroubleshoot.execute(
    { "linkPrefix": "x-linkPrefix", "date": "x-date", "timezone": "x-timezone" } as never,
    ctx,
  );

  assertEquals(queryOf(calls[0].url), {
    "linkPrefix": "x-linkPrefix",
    "date": "x-date",
    "timezone": "x-timezone",
  });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("event-slots-troubleshoot: declares a read-only shape", () => {
  assertEquals(eventSlotsTroubleshoot.type, "read");
  assertEquals(eventSlotsTroubleshoot.idempotent, undefined);
  assertEquals(eventSlotsTroubleshoot.params!.filter((p) => p.required).map((p) => p.key), [
    "linkPrefix",
    "date",
    "timezone",
  ]);
});
