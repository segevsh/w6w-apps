import { assertEquals, assertThrows } from "@std/assert";
import a from "../../actions/get-user.ts";
import { BASE, mockCtx, run } from "../_helpers.ts";

Deno.test("get-user: GET users.info with exactly one identifier", async () => {
  assertEquals((await run(a, { userId: "U" })).call.url, `${BASE}/users.info?userId=U`);
  assertEquals((await run(a, { username: "bob" })).call.url, `${BASE}/users.info?username=bob`);
  assertEquals((await run(a, { email: "b@x.io" })).call.url, `${BASE}/users.info?email=b%40x.io`);
});

Deno.test("get-user: zero or several identifiers are refused before any call", () => {
  const { ctx, calls } = mockCtx();
  assertThrows(() => a.execute({}, ctx), Error, "exactly one");
  assertThrows(() => a.execute({ userId: "U", username: "bob" }, ctx), Error, "exactly one");
  assertEquals(calls.length, 0);
});
