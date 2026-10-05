import { assertEquals } from "@std/assert";
import ping from "../../actions/ping.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("ping: GET /ping", async () => {
  const { ctx, calls } = mockCtx([{ body: { pong: true } }]);
  assertEquals(await ping.execute({}, ctx), { pong: true });
  assertEquals(calls[0].url, `${API_ROOT}/ping`);
});
