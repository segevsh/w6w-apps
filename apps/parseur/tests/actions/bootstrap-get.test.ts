import { assertEquals } from "@std/assert";
import bootstrapGet from "../../actions/bootstrap-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("bootstrap-get: GETs /bootstrap", async () => {
  const { ctx, calls } = mockCtx([{ body: { email_domain: "in.parseur.com", choices: {} } }]);
  const out = await bootstrapGet.execute({}, ctx) as { email_domain: string };

  assertEquals(pathOf(calls[0].url), "/bootstrap");
  assertEquals(out.email_domain, "in.parseur.com");
});

Deno.test("bootstrap-get: does not require auth — the endpoint is genuinely public", () => {
  assertEquals(bootstrapGet.requiresAuth, false);
});
