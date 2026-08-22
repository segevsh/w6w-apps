import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-update.ts";

/**
 * `domain_data` REPLACES the list, so sending one domain to add a second
 * removes the first — and dropping a verified domain stops SSO for everybody
 * with an address at it, silently.
 */
Deno.test("organization-update: leaving domains blank changes only the name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "org_1" } }]);
  await action.execute!({ organizationId: "org_1", name: "Acme Inc" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { name: "Acme Inc" });
});

Deno.test("organization-update: replacing the domain list is logged as a replacement", async () => {
  const { ctx, logs, calls } = mockCtx([{ status: 200, body: { id: "org_1" } }]);
  await action.execute!({ organizationId: "org_1", domains: "acme.com,acme.io" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).domain_data, [
    { domain: "acme.com", state: "pending" },
    { domain: "acme.io", state: "pending" },
  ]);
  assert(logs.some((l) => /entire domain list/.test(l.message)), JSON.stringify(logs));
});

Deno.test("organization-update: the domains param says it REPLACES", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "domains")!;
  assert(/REPLACES/.test(p.hint!), p.hint);
});

Deno.test("organization-update: an empty update is refused rather than sent", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ organizationId: "org_1" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});

Deno.test("organization-update: needs an organization id", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ name: "x" }, ctx),
    Error,
    "organizationId",
  );
});
