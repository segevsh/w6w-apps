import { assertEquals } from "@std/assert";
import dealList from "../../actions/deal-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("deal-list: sends every input as query", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await dealList.execute({
    "contactId": 7,
    "userIds": "x-userIds",
    "productIds": "x-productIds",
    "transactionType": "WON",
    "contactStatuses": "x-contactStatuses",
    "eventIds": "x-eventIds",
    "search": "x-search",
    "limit": 7,
    "page": 7,
    "orderBy": "asc",
    "orderColumn": "id",
    "timeFrom": "x-timeFrom",
    "timeTo": "x-timeTo",
  } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/deals");
  assertEquals(queryOf(calls[0].url), {
    "contactId": "7",
    "userIds": "x-userIds",
    "productIds": "x-productIds",
    "transactionType": "WON",
    "contactStatuses": "x-contactStatuses",
    "eventIds": "x-eventIds",
    "search": "x-search",
    "limit": "7",
    "page": "7",
    "orderBy": "asc",
    "orderColumn": "id",
    "timeFrom": "x-timeFrom",
    "timeTo": "x-timeTo",
  });
  assertEquals(out, REPLY);
});

Deno.test("deal-list: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await dealList.execute({} as never, ctx);

  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("deal-list: declares a read-only shape", () => {
  assertEquals(dealList.type, "read");
  assertEquals(dealList.idempotent, undefined);
  assertEquals(dealList.params!.filter((p) => p.required).map((p) => p.key), []);
});
