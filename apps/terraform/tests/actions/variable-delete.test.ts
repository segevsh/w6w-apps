import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/variable-delete.ts";

const listing = (attributes: Record<string, unknown>) => ({
  status: 200,
  body: { data: [{ id: "var-1", attributes }] },
});

Deno.test("variable-delete: resolves the variable by name and deletes it by id", async () => {
  const { ctx, calls } = mockCtx([
    listing({ key: "region", category: "terraform", sensitive: false }),
    { status: 204 },
  ]);
  const result = await action.execute({ workspaceId: "ws-1", key: "region" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].url, "https://app.terraform.io/api/v2/workspaces/ws-1/vars");
  assertEquals(calls[1].url, "https://app.terraform.io/api/v2/workspaces/ws-1/vars/var-1");
  assertEquals(calls[1].method, "DELETE");
  assertEquals(result.deleted, true);
  assertEquals(result.wasSensitive, false);
});

/** The same name can exist in both categories. */
Deno.test("variable-delete: a name in the other category is not found", async () => {
  const { ctx, calls } = mockCtx([listing({ key: "region", category: "terraform" })]);
  let message = "";
  try {
    await action.execute({ workspaceId: "ws-1", key: "region", category: "env" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/no `env` variable named "region"/.test(message), message);
  assert(/exist in both categories/.test(message), message);
  assertEquals(calls.length, 1);
});

/** Nothing could read it while it existed, so there is no copy to restore. */
Deno.test("variable-delete: a sensitive variable needs its name typed back", async () => {
  for (const confirm of [undefined, "", "REGION"]) {
    const { ctx, calls } = mockCtx([
      listing({ key: "AWS_SECRET_ACCESS_KEY", category: "env", sensitive: true }),
    ]);
    let message = "";
    try {
      await action.execute({
        workspaceId: "ws-1",
        key: "AWS_SECRET_ACCESS_KEY",
        category: "env",
        confirmKey: confirm,
      }, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(/is sensitive: set `confirmKey`/.test(message), `${confirm}: ${message}`);
    assertEquals(calls.length, 1);
  }
});

Deno.test("variable-delete: a confirmed sensitive delete goes through and warns", async () => {
  const { ctx, logs } = mockCtx([
    listing({ key: "AWS_SECRET_ACCESS_KEY", category: "env", sensitive: true }),
    { status: 204 },
  ]);
  const result = await action.execute({
    workspaceId: "ws-1",
    key: "AWS_SECRET_ACCESS_KEY",
    category: "env",
    confirmKey: "AWS_SECRET_ACCESS_KEY",
  }, ctx) as Record<string, unknown>;
  assertEquals(result.wasSensitive, true);
  assertEquals(logs[0].level, "warn");
  assert(/cannot be recovered/.test(logs[0].message), logs[0].message);
});

/** A non-sensitive variable does not need the confirmation. */
Deno.test("variable-delete: an ordinary variable deletes without a confirmation", async () => {
  const { ctx, logs } = mockCtx([
    listing({ key: "region", category: "terraform", sensitive: false }),
    { status: 204 },
  ]);
  await action.execute({ workspaceId: "ws-1", key: "region" }, ctx);
  assertEquals(logs[0].level, "info");
});

Deno.test("variable-delete: a key is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ workspaceId: "ws-1" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`key` is required/.test(message), message);
  assertEquals(calls.length, 0);
});

/** The difference only appears at the next plan, days later. */
Deno.test("variable-delete: says when the effect actually shows up", () => {
  assert(/effect only appears at the NEXT plan/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});
