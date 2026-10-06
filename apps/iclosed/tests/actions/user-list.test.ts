import { assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("user-list: sends every input as query", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await userList.execute(
    { "limit": 7, "page": 7, "search": "x-search", "ids": "x-ids" } as never,
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/users");
  assertEquals(queryOf(calls[0].url), {
    "limit": "7",
    "page": "7",
    "search": "x-search",
    "ids": "x-ids",
  });
  assertEquals(out, REPLY);
});

Deno.test("user-list: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await userList.execute({} as never, ctx);

  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("user-list: declares a read-only shape", () => {
  assertEquals(userList.type, "read");
  assertEquals(userList.idempotent, undefined);
  assertEquals(userList.params!.filter((p) => p.required).map((p) => p.key), []);
});
