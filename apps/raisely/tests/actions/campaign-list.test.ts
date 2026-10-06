import { assertEquals } from "@std/assert";
import campaignList from "../../actions/campaign-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-list: GETs /v3/campaigns with every filter and the list params on the query", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ uuid: "1" }], { total: 41 }) }]);
  const out = await campaignList.execute({
    "private": true,
    "limit": 5,
    "offset": 10,
    "q": "x",
    "sort": "createdAt",
    "order": "desc",
    "path": "main",
    "mode": "LIVE",
    "includeTags": true,
  }, ctx) as {
    data: unknown[];
    pagination: { total: number };
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v3/campaigns");
  assertEquals(queryOf(calls[0].url), {
    "private": "true",
    "limit": "5",
    "offset": "10",
    "q": "x",
    "sort": "createdAt",
    "order": "desc",
    "path": "main",
    "mode": "LIVE",
    "includeTags": "true",
  });
  assertEquals(out.data.length, 1);
  assertEquals(out.pagination.total, 41);
});

Deno.test("campaign-list: unset filters are omitted, and private=true is asked for by default", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await campaignList.execute({ private: true }, ctx);
  assertEquals(queryOf(calls[0].url), { "private": "true" });
});

Deno.test("campaign-list: the param default for private is true and the action never signs", () => {
  const p = campaignList.params!.find((p) => p.key === "private");
  assertEquals(p?.default, true);
  assertEquals(campaignList.type, "read");
});

Deno.test("campaign-list: a Raisely error body surfaces its code and detail", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { code: "forbidden", detail: "You are not authorized to do that" },
  }]);
  let message = "";
  try {
    await campaignList.execute({}, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Raisely 403"), true, message);
  assertEquals(message.includes("forbidden"), true, message);
});
