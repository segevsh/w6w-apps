import { assertEquals } from "@std/assert";
import callList from "../../actions/call-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("call-list: sends every input as query", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await callList.execute({
    "ids": "x-ids",
    "contactId": 7,
    "eventType": "PAST",
    "search": "x-search",
    "dateFrom": "x-dateFrom",
    "dateTo": "x-dateTo",
    "createdAtStart": "x-createdAtStart",
    "createdAtEnd": "x-createdAtEnd",
    "location": "x-location",
    "orderColumn": "createdAt",
    "orderBy": "asc",
    "limit": 7,
    "page": 7,
    "userIds": "x-userIds",
    "eventIds": "x-eventIds",
    "types": "x-types",
    "inviteeEmails": "x-inviteeEmails",
    "outcomes": "x-outcomes",
    "noSaleReason": "x-noSaleReason",
    "utmKeys": "x-utmKeys",
    "utmValues": "x-utmValues",
    "callTypes": "x-callTypes",
    "setterIds": "x-setterIds",
  } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/eventCalls");
  assertEquals(queryOf(calls[0].url), {
    "ids": "x-ids",
    "contactId": "7",
    "eventType": "PAST",
    "search": "x-search",
    "dateFrom": "x-dateFrom",
    "dateTo": "x-dateTo",
    "createdAtStart": "x-createdAtStart",
    "createdAtEnd": "x-createdAtEnd",
    "location": "x-location",
    "orderColumn": "createdAt",
    "orderBy": "asc",
    "limit": "7",
    "page": "7",
    "userIds": "x-userIds",
    "eventIds": "x-eventIds",
    "types": "x-types",
    "inviteeEmails": "x-inviteeEmails",
    "outcomes": "x-outcomes",
    "noSaleReason": "x-noSaleReason",
    "utmKeys": "x-utmKeys",
    "utmValues": "x-utmValues",
    "callTypes": "x-callTypes",
    "setterIds": "x-setterIds",
  });
  assertEquals(out, REPLY);
});

Deno.test("call-list: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await callList.execute({} as never, ctx);

  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("call-list: declares a read-only shape", () => {
  assertEquals(callList.type, "read");
  assertEquals(callList.idempotent, undefined);
  assertEquals(callList.params!.filter((p) => p.required).map((p) => p.key), []);
});
