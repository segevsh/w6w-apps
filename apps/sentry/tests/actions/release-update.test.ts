import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/release-update.ts";

const display = { organizationSlug: "acme" };

Deno.test("release-update: PUTs only what was set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ version: "1.2.3", url: "https://ci/build/9" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://us.sentry.io/api/0/organizations/acme/releases/1.2.3/");
  assertEquals(JSON.parse(calls[0].body!), { url: "https://ci/build/9" });
});

Deno.test("release-update: refuses a no-op", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ version: "1.2.3" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});
