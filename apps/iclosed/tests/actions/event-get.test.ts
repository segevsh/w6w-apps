import { assertEquals } from "@std/assert";
import eventGet from "../../actions/event-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("event-get: sends every input as query", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await eventGet.execute({ "id": 7, "linkPrefix": "x-linkPrefix" } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/events/detail");
  assertEquals(queryOf(calls[0].url), { "id": "7", "linkPrefix": "x-linkPrefix" });
  assertEquals(out, REPLY);
});

Deno.test("event-get: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await eventGet.execute({} as never, ctx);

  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("event-get: declares a read-only shape", () => {
  assertEquals(eventGet.type, "read");
  assertEquals(eventGet.idempotent, undefined);
  assertEquals(eventGet.params!.filter((p) => p.required).map((p) => p.key), []);
});
