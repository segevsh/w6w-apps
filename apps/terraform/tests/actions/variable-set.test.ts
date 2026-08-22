import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/variable-set.ts";

const existing = (attributes: Record<string, unknown>) => ({
  status: 200,
  body: { data: [{ id: "var-1", attributes }] },
});

const empty = { status: 200, body: { data: [] } };

const written = (attributes: Record<string, unknown>) => ({
  status: 200,
  body: { data: { type: "vars", id: "var-1", attributes } },
});

/** Creating one that exists is a 422; updating one that does not needs an id. */
Deno.test("variable-set: POSTs when the variable is absent", async () => {
  const { ctx, calls } = mockCtx([empty, written({ key: "region", category: "terraform" })]);
  const result = await action.execute(
    { workspaceId: "ws-1", key: "region", value: "eu-west-1" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[1].url, "https://app.terraform.io/api/v2/workspaces/ws-1/vars");
  assertEquals(calls[1].method, "POST");
  assertEquals(JSON.parse(calls[1].body!).data.type, "vars");
  assertEquals(result.created, true);
});

Deno.test("variable-set: PATCHes the existing variable by its id", async () => {
  const { ctx, calls } = mockCtx([
    existing({ key: "region", category: "terraform", sensitive: false }),
    written({ key: "region", category: "terraform" }),
  ]);
  const result = await action.execute(
    { workspaceId: "ws-1", key: "region", value: "us-east-1" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[1].url, "https://app.terraform.io/api/v2/workspaces/ws-1/vars/var-1");
  assertEquals(calls[1].method, "PATCH");
  assertEquals(result.created, false);
});

/** The same name can exist once as `terraform` and once as `env`. */
Deno.test("variable-set: matches on key AND category, so the categories do not collide", async () => {
  const { ctx, calls } = mockCtx([
    existing({ key: "region", category: "terraform" }),
    written({ key: "region", category: "env" }),
  ]);
  const result = await action.execute(
    { workspaceId: "ws-1", key: "region", value: "x", category: "env" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[1].method, "POST", "the terraform one is a different variable");
  assertEquals(result.created, true);
});

/**
 * Writing back the null a read returned silently empties a credential the
 * runs depend on.
 */
Deno.test("variable-set: refuses to update a sensitive variable without a value", async () => {
  const { ctx, calls } = mockCtx([
    existing({ key: "AWS_SECRET_ACCESS_KEY", category: "env", sensitive: true }),
  ]);
  let message = "";
  try {
    await action.execute(
      { workspaceId: "ws-1", key: "AWS_SECRET_ACCESS_KEY", category: "env" },
      ctx,
    );
  } catch (err) {
    message = String(err);
  }
  assert(/cannot be read back by anything/.test(message), message);
  assert(/write an empty string over a credential/.test(message), message);
  assertEquals(calls.length, 1, "nothing was written");
});

Deno.test("variable-set: a value is required to create", async () => {
  const { ctx, calls } = mockCtx([empty]);
  let message = "";
  try {
    await action.execute({ workspaceId: "ws-1", key: "region" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`value` is required to create/.test(message), message);
  assertEquals(calls.length, 1);
});

Deno.test("variable-set: sensitive and hcl are always sent, false included", async () => {
  const { ctx, calls } = mockCtx([empty, written({ key: "x" })]);
  await action.execute({ workspaceId: "ws-1", key: "x", value: "1" }, ctx);
  const attributes = JSON.parse(calls[1].body!).data.attributes;
  assertEquals(attributes.sensitive, false);
  assertEquals(attributes.hcl, false);
  assertEquals(attributes.category, "terraform");
});

/** Without hcl, `["a","b"]` is a string and the type error appears in the plan. */
Deno.test("variable-set: hcl is passed through when asked for", async () => {
  const { ctx, calls } = mockCtx([empty, written({ key: "zones" })]);
  await action.execute(
    { workspaceId: "ws-1", key: "zones", value: '["a","b"]', hcl: true },
    ctx,
  );
  assertEquals(JSON.parse(calls[1].body!).data.attributes.hcl, true);
});

/** Marking one sensitive is one-way. */
Deno.test("variable-set: logs the key and flags, never the value", async () => {
  const { ctx, logs } = mockCtx([
    empty,
    written({ key: "AWS_SECRET_ACCESS_KEY", sensitive: true }),
  ]);
  await action.execute({
    workspaceId: "ws-1",
    key: "AWS_SECRET_ACCESS_KEY",
    value: "AKIAsupersecret",
    category: "env",
    sensitive: true,
  }, ctx);
  const data = JSON.stringify(logs[0].data);
  assertEquals(data.includes("AKIAsupersecret"), false);
  assertEquals(logs[0].data, {
    workspaceId: "ws-1",
    key: "AWS_SECRET_ACCESS_KEY",
    category: "env",
    sensitive: true,
  });
});

Deno.test("variable-set: a key is required", async () => {
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

/** A provider credential set as `terraform` is ignored, and the run fails. */
Deno.test("variable-set: the category hint says which one credentials go in", () => {
  const category = action.params!.find((p) => p.key === "category")!;
  assert(/IGNORED silently/.test(category.hint!), category.hint);
  assert(/Provider credentials must be `env`/.test(category.hint!), category.hint);
  assertEquals(action.idempotent, true);
});
