import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bucket-iam-get.ts";

const policy = (bindings: Array<Record<string, unknown>>) => ({
  status: 200,
  body: { bindings },
});

Deno.test("bucket-iam-get: reads the policy at version 3", async () => {
  const { ctx, calls } = mockCtx([policy([
    { role: "roles/storage.objectViewer", members: ["user:a@example.com"] },
  ])]);
  const result = await action.execute({ bucket: "uploads" }, ctx) as Record<string, unknown>;
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/storage/v1/b/uploads/iam");
  // Version 1 omits conditional bindings rather than reporting them.
  assertEquals(url.searchParams.get("optionsRequestedPolicyVersion"), "3");
  assertEquals(result.roles, ["roles/storage.objectViewer"]);
  assertEquals(result.memberCount, 1);
});

/** allUsers is the internet. */
Deno.test("bucket-iam-get: flags allUsers and warns", async () => {
  const { ctx, logs } = mockCtx([policy([
    { role: "roles/storage.objectViewer", members: ["allUsers"] },
  ])]);
  const result = await action.execute({ bucket: "uploads" }, ctx) as Record<string, unknown>;
  assertEquals(result.publicToInternet, true);
  assertEquals(logs[0].level, "warn");
  assert(/public to the internet/.test(logs[0].message), logs[0].message);
});

/**
 * The one granted by mistake, because "authenticated" reads as "our users"
 * and means anybody with a Google account.
 */
Deno.test("bucket-iam-get: flags allAuthenticatedUsers separately, and says what it means", async () => {
  const { ctx, logs } = mockCtx([policy([
    { role: "roles/storage.objectViewer", members: ["allAuthenticatedUsers"] },
  ])]);
  const result = await action.execute({ bucket: "uploads" }, ctx) as Record<string, unknown>;
  assertEquals(result.publicToAnyGoogleAccount, true);
  assertEquals(result.publicToInternet, false);
  assert(/not the same as anybody in your organisation/.test(logs[0].message), logs[0].message);
});

Deno.test("bucket-iam-get: an ordinary policy does not warn", async () => {
  const { ctx, logs } = mockCtx([policy([
    { role: "roles/storage.admin", members: ["serviceAccount:x@y.iam.gserviceaccount.com"] },
  ])]);
  const result = await action.execute({ bucket: "uploads" }, ctx) as Record<string, unknown>;
  assertEquals(result.publicToInternet, false);
  assertEquals(logs.length, 0);
});

/** Reading members without the condition overstates the access. */
Deno.test("bucket-iam-get: counts conditional bindings and marks them", async () => {
  const { ctx } = mockCtx([policy([
    { role: "roles/storage.objectViewer", members: ["user:a@example.com"] },
    {
      role: "roles/storage.objectAdmin",
      members: ["user:b@example.com"],
      condition: { expression: "resource.name.startsWith('x')" },
    },
  ])]);
  const result = await action.execute({ bucket: "uploads" }, ctx) as Record<string, unknown>;
  assertEquals(result.conditionalCount, 1);
  const bindings = result.bindings as Array<Record<string, unknown>>;
  assertEquals(bindings[0].conditional, false);
  assertEquals(bindings[1].conditional, true);
});

Deno.test("bucket-iam-get: members are deduplicated across bindings", async () => {
  const { ctx } = mockCtx([policy([
    { role: "roles/storage.objectViewer", members: ["user:a@example.com"] },
    { role: "roles/storage.objectAdmin", members: ["user:a@example.com", "user:b@example.com"] },
  ])]);
  const result = await action.execute({ bucket: "uploads" }, ctx) as Record<string, unknown>;
  assertEquals(result.memberCount, 2);
});

/** Project-level roles apply here and are not in this response. */
Deno.test("bucket-iam-get: says this is not the whole picture", () => {
  assert(
    /Project-level roles apply too and are NOT in this response/.test(action.description!),
    action.description,
  );
});

Deno.test("bucket-iam-get: an empty policy is not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute({ bucket: "uploads" }, ctx) as Record<string, unknown>;
  assertEquals(result.memberCount, 0);
  assertEquals(result.roles, []);
});
