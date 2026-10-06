import { assertEquals } from "@std/assert";
import transactionList from "../../actions/transaction-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("transaction-list: sends every input as query", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await transactionList.execute(
    {
      "id": 7,
      "synced": "true",
      "search": "x-search",
      "source": "x-source",
      "timeFrom": "x-timeFrom",
      "timeTo": "x-timeTo",
      "page": 7,
      "limit": 7,
      "sort": "asc",
      "sortByAmount": "ascAmount",
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/transactions");
  assertEquals(queryOf(calls[0].url), {
    "id": "7",
    "synced": "true",
    "search": "x-search",
    "source": "x-source",
    "timeFrom": "x-timeFrom",
    "timeTo": "x-timeTo",
    "page": "7",
    "limit": "7",
    "sort": "asc",
    "sortByAmount": "ascAmount",
  });
  assertEquals(out, REPLY);
});

Deno.test("transaction-list: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await transactionList.execute({} as never, ctx);

  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("transaction-list: declares a read-only shape", () => {
  assertEquals(transactionList.type, "read");
  assertEquals(transactionList.idempotent, undefined);
  assertEquals(transactionList.params!.filter((p) => p.required).map((p) => p.key), []);
});
