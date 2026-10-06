import { assertEquals } from "@std/assert";
import credentialList from "../../actions/credential-list.ts";
import { CREDENTIAL, mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("credential-list: GET /v1/credentials with cursor and limit, returns the page as-is", async () => {
  const { ctx, calls } = mockCtx([{ body: page([CREDENTIAL], "NEXT") }]);
  const out = await credentialList.execute({ cursor: "C1", limit: 50 }, ctx) as {
    data: unknown[];
    pagination: { next: string };
  };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/credentials");
  assertEquals(queryOf(calls[0].url), { cursor: "C1", limit: "50" });
  assertEquals(out.data.length, 1);
  assertEquals(out.pagination.next, "NEXT");
});

Deno.test("credential-list: no params sends no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await credentialList.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
