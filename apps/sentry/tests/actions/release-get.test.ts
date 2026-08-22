import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/release-get.ts";

const display = { organizationSlug: "acme" };

Deno.test("release-get: percent-encodes a version containing a slash", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { version: "feature/x@1" } }], { display });
  await action.execute!({ version: "feature/x@1" }, ctx);
  // The raw URL keeps the escape; a bare `/` would address a different endpoint.
  assertEquals(
    calls[0].url.startsWith(
      "https://us.sentry.io/api/0/organizations/acme/releases/feature%2Fx%401/",
    ),
    true,
    calls[0].url,
  );
});

Deno.test("release-get: health data is opt-in", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }, { status: 200, body: {} }], {
    display,
  });
  await action.execute!({ version: "1.0.0" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("health"), null);
  await action.execute!({ version: "1.0.0", health: true, project: "web" }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.get("health"), "true");
  assertEquals(new URL(calls[1].url).searchParams.get("project"), "web");
});

Deno.test("release-get: a blank version fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`version` is required");
  assertEquals(calls.length, 0);
});
