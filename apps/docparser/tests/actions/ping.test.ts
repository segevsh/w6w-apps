import { assertEquals } from "@std/assert";
import ping from "../../actions/ping.ts";
import { errorOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ping: GET /v1/ping returns pong, with no credential in the request", async () => {
  const { ctx, calls } = mockCtx([{ body: { msg: "pong" } }]);
  assertEquals(await ping.execute({}, ctx), { msg: "pong" });
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/ping");
  assertEquals(calls[0].headers.api_key, undefined);
  assertEquals(calls[0].url.includes("api_key"), false);
});

Deno.test("ping: surfaces the vendor error text on 403", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: "api key not valid" } }]);
  const err = await errorOf(() => ping.execute({}, ctx));
  assertEquals(err.message, "Docparser 403 for GET /v1/ping: api key not valid");
});
