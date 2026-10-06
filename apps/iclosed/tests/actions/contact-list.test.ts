import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("contact-list: sends every input as query", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await contactList.execute(
    {
      "userId": 7,
      "statuses": "x-statuses",
      "eventIds": "x-eventIds",
      "search": "x-search",
      "limit": 7,
      "page": 7,
      "timeFrom": "x-timeFrom",
      "timeTo": "x-timeTo",
      "orderBy": "asc",
      "orderColumn": "id",
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/contacts");
  assertEquals(queryOf(calls[0].url), {
    "userId": "7",
    "statuses": "x-statuses",
    "eventIds": "x-eventIds",
    "search": "x-search",
    "limit": "7",
    "page": "7",
    "timeFrom": "x-timeFrom",
    "timeTo": "x-timeTo",
    "orderBy": "asc",
    "orderColumn": "id",
  });
  assertEquals(out, REPLY);
});

Deno.test("contact-list: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await contactList.execute({} as never, ctx);

  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("contact-list: declares a read-only shape", () => {
  assertEquals(contactList.type, "read");
  assertEquals(contactList.idempotent, undefined);
  assertEquals(contactList.params!.filter((p) => p.required).map((p) => p.key), []);
});
