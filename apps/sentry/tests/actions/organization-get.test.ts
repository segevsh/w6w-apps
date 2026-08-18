import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-get.ts";

const display = { organizationSlug: "acme" };

Deno.test("organization-get: detailed is Sentry's string flag, defaulting to on", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }, { status: 200, body: {} }], {
    display,
  });
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("detailed"), "1");
  await action.execute!({ detailed: false }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.get("detailed"), "0");
});

Deno.test("organization-get: without a slug anywhere it says so", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "organizationSlug");
  assertEquals(calls.length, 0);
});
