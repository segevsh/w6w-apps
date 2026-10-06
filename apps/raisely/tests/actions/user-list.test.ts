import { assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-list: GETs /v3/users with every filter and the list params on the query", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ uuid: "1" }], { total: 41 }) }]);
  const out = await userList.execute({
    "private": true,
    "limit": 5,
    "offset": 10,
    "q": "x",
    "sort": "createdAt",
    "order": "desc",
    "email": "a@b.org",
    "phone_number": "123",
  }, ctx) as {
    data: unknown[];
    pagination: { total: number };
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v3/users");
  assertEquals(queryOf(calls[0].url), {
    "private": "true",
    "limit": "5",
    "offset": "10",
    "q": "x",
    "sort": "createdAt",
    "order": "desc",
    "email": "a@b.org",
    "phone_number": "123",
  });
  assertEquals(out.data.length, 1);
  assertEquals(out.pagination.total, 41);
});

Deno.test("user-list: unset filters are omitted, and private=true is asked for by default", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await userList.execute({ private: true }, ctx);
  assertEquals(queryOf(calls[0].url), { "private": "true" });
});

Deno.test("user-list: the param default for private is true and the action never signs", () => {
  const p = userList.params!.find((p) => p.key === "private");
  assertEquals(p?.default, true);
  assertEquals(userList.type, "read");
});

Deno.test("user-list: a Raisely error body surfaces its code and detail", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { code: "forbidden", detail: "You are not authorized to do that" },
  }]);
  let message = "";
  try {
    await userList.execute({}, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Raisely 403"), true, message);
  assertEquals(message.includes("forbidden"), true, message);
});
