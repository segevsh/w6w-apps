import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-create.ts";

/**
 * Claiming a domain decides where the people with those addresses are sent to
 * log in, so the default is the one that makes the customer prove ownership.
 */
Deno.test("organization-create: domains default to pending verification", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "org_1" } }]);
  await action.execute!({ name: "Acme", domains: "acme.com" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Acme",
    domain_data: [{ domain: "acme.com", state: "pending" }],
  });
});

Deno.test("organization-create: asserting verified domains is warned about", async () => {
  const { ctx, logs } = mockCtx([{ status: 201, body: { id: "org_1" } }]);
  await action.execute!({ name: "Acme", domains: "acme.com", domainState: "verified" }, ctx);
  const warning = logs.find((l) => l.level === "warn");
  assert(warning, "no warning for an asserted domain");
  assert(/route/.test(warning!.message), warning!.message);
});

/** No domains, no claim — so nothing to warn about. */
Deno.test("organization-create: a bare organization warns about nothing", async () => {
  const { ctx, logs, calls } = mockCtx([{ status: 201, body: { id: "org_1" } }]);
  await action.execute!({ name: "Acme", domainState: "verified" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "Acme" });
  assertEquals(logs.filter((l) => l.level === "warn").length, 0);
});

Deno.test("organization-create: the domain-state param explains the risk", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "domainState")!;
  assert(/log in/.test(p.hint!), p.hint);
});

Deno.test("organization-create: a nameless organization is refused before the request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({ name: "  " }, ctx), Error, "name");
  assertEquals(calls.length, 0);
});
