import { assert, assertEquals } from "@std/assert";
import storeGet from "../../actions/store-get.ts";
import accessToken, { PROBE_PATH } from "../../auth/access-token.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("store-get: GETs the v2 store profile bare", async () => {
  const { ctx, calls } = mockCtx([{
    body: { name: "Acme", domain: "acme.example.com", currency: "USD", status: "live" },
  }]);
  const out = await storeGet.execute({}, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v2/store");
  assertEquals(out.name, "Acme");
});

Deno.test("store-get: is an Action a human asked for, and NOT the credential probe", () => {
  // /v2/store returns admin_email, order_email and the owner's name. A probe
  // would copy that into the health surface on every check; /v2/time does not.
  assertEquals(PROBE_PATH as string, "/time");
  assert((PROBE_PATH as string) !== "/store");
  assertEquals(accessToken.type, "custom");
});

Deno.test("store-get: takes no params, so a host could invoke it with {}", () => {
  assertEquals(storeGet.params, []);
  assertEquals(storeGet.type, "read");
});
