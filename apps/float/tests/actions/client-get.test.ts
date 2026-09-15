import { assertEquals } from "@std/assert";
import clientGet from "../../actions/client-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("client-get - GETs /clients/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { client_id: 1, name: "Red Circle" } }]);
  const out = await clientGet.execute({ client_id: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/clients/1");
  assertEquals(out, { client_id: 1, name: "Red Circle" });
});
