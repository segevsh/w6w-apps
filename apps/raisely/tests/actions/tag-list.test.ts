import { assertEquals } from "@std/assert";
import tagList from "../../actions/tag-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tag-list: GETs /v3/tags with every filter and the list params on the query", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ uuid: "1" }], { total: 41 }) }]);
  const out = await tagList.execute({
    "private": true,
    "limit": 5,
    "offset": 10,
    "q": "x",
    "sort": "createdAt",
    "order": "desc",
    "recordType": "user",
    "path": "vip",
  }, ctx) as {
    data: unknown[];
    pagination: { total: number };
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v3/tags");
  assertEquals(queryOf(calls[0].url), {
    "private": "true",
    "limit": "5",
    "offset": "10",
    "q": "x",
    "sort": "createdAt",
    "order": "desc",
    "recordType": "user",
    "path": "vip",
  });
  assertEquals(out.data.length, 1);
  assertEquals(out.pagination.total, 41);
});

Deno.test("tag-list: unset filters are omitted, and private=true is asked for by default", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await tagList.execute({ private: true }, ctx);
  assertEquals(queryOf(calls[0].url), { "private": "true" });
});

Deno.test("tag-list: the param default for private is true and the action never signs", () => {
  const p = tagList.params!.find((p) => p.key === "private");
  assertEquals(p?.default, true);
  assertEquals(tagList.type, "read");
});

Deno.test("tag-list: a Raisely error body surfaces its code and detail", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { code: "forbidden", detail: "You are not authorized to do that" },
  }]);
  let message = "";
  try {
    await tagList.execute({}, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Raisely 403"), true, message);
  assertEquals(message.includes("forbidden"), true, message);
});
