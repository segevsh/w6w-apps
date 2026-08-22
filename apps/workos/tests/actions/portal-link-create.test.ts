import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/portal-link-create.ts";

Deno.test("portal-link-create: posts the organization and intent", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { link: "https://setup.workos.com/x" } }]);
  const result = await action.execute!(
    { organizationId: "org_1", intent: "dsync", returnUrl: "https://app.example.com/done" },
    ctx,
  ) as { link: string };
  assertEquals(calls[0].url, "https://api.workos.com/portal/generate_link");
  assertEquals(JSON.parse(calls[0].body!), {
    organization: "org_1",
    intent: "dsync",
    return_url: "https://app.example.com/done",
  });
  assertEquals(result.link, "https://setup.workos.com/x");
});

/**
 * Anyone holding the link can configure that organization's authentication, and
 * it expires in minutes — so it is returned and never written to a log.
 */
Deno.test("portal-link-create: logs the organization and intent, never the link", async () => {
  const { ctx, logs } = mockCtx([{
    status: 201,
    body: { link: "https://setup.workos.com/secret" },
  }]);
  await action.execute!({ organizationId: "org_1", intent: "sso" }, ctx);
  assert(!JSON.stringify(logs).includes("secret"), JSON.stringify(logs));
  assertEquals(logs[0].data, { organizationId: "org_1", intent: "sso" });
});

/** SSO and Directory Sync are separate setups, so they are separate pages. */
Deno.test("portal-link-create: offers both of the intents that matter", () => {
  const p = (action.params as Array<{ key: string; options?: Array<{ value: string }> }>)
    .find((p) => p.key === "intent")!;
  const values = p.options!.map((o) => o.value);
  assert(values.includes("sso") && values.includes("dsync"), values.join(","));
});

Deno.test("portal-link-create: needs an organization", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "organizationId");
  assertEquals(calls.length, 0);
});
