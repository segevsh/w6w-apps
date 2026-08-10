import { assertEquals } from "@std/assert";
import meGet from "../../actions/me-get.ts";
import { doc, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("me-get: GETs /v1/me with no parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("1", "users", { name: "Jo" }) }]);
  await meGet.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/me");
  assertEquals(queryOf(calls[0]), {});
});

/** Safe for a host to invoke with `{}` — it declares no params at all. */
Deno.test("me-get: declares no params", () => {
  assertEquals(meGet.params, []);
});
