import { assertEquals } from "@std/assert";
import donationList from "../../actions/donation-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("donation-list: GETs /v3/donations with every filter and the list params on the query", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ uuid: "1" }], { total: 41 }) }]);
  const out = await donationList.execute({
    "private": true,
    "limit": 5,
    "offset": 10,
    "q": "x",
    "sort": "createdAt",
    "order": "desc",
    "campaign": "c1",
    "profile": "p1",
    "user": "u1",
    "type": "OFFLINE",
    "isSuspicious": false,
  }, ctx) as {
    data: unknown[];
    pagination: { total: number };
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v3/donations");
  assertEquals(queryOf(calls[0].url), {
    "private": "true",
    "limit": "5",
    "offset": "10",
    "q": "x",
    "sort": "createdAt",
    "order": "desc",
    "campaign": "c1",
    "profile": "p1",
    "user": "u1",
    "type": "OFFLINE",
    "isSuspicious": "false",
  });
  assertEquals(out.data.length, 1);
  assertEquals(out.pagination.total, 41);
});

Deno.test("donation-list: unset filters are omitted, and private=true is asked for by default", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await donationList.execute({ private: true }, ctx);
  assertEquals(queryOf(calls[0].url), { "private": "true" });
});

Deno.test("donation-list: the param default for private is true and the action never signs", () => {
  const p = donationList.params!.find((p) => p.key === "private");
  assertEquals(p?.default, true);
  assertEquals(donationList.type, "read");
});

Deno.test("donation-list: a Raisely error body surfaces its code and detail", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { code: "forbidden", detail: "You are not authorized to do that" },
  }]);
  let message = "";
  try {
    await donationList.execute({}, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Raisely 403"), true, message);
  assertEquals(message.includes("forbidden"), true, message);
});
