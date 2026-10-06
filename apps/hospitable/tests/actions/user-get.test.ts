import { assertEquals } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-get: GET /v2/user, no query, no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "u1", name: "Ann" } } }]);
  const out = await userGet.execute({}, ctx) as { data: { name: string } };
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/user");
  assertEquals(calls[0].url.includes("?"), false);
  assertEquals(calls[0].body, null);
  assertEquals(
    calls[0].headers.authorization,
    undefined,
    "credentials belong to sign, not actions",
  );
  assertEquals(out.data.name, "Ann");
});
