import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workspace-update.ts";

const patched = (attributes: Record<string, unknown>) => ({
  status: 200,
  body: { data: { type: "workspaces", id: "ws-1", attributes } },
});

Deno.test("workspace-update: PATCHes kebab-case attributes by id", async () => {
  const { ctx, calls } = mockCtx([patched({ description: "the production stack" })]);
  await action.execute({ workspaceId: "ws-1", description: "the production stack" }, ctx);
  assertEquals(calls[0].url, "https://app.terraform.io/api/v2/workspaces/ws-1");
  assertEquals(calls[0].method, "PATCH");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.type, "workspaces");
  assertEquals(body.data.attributes.description, "the production stack");
});

/**
 * The trap this action exists for: the server ignores what it does not
 * recognise and answers 200, so a silent no-op looks like success.
 */
Deno.test("workspace-update: reports what actually changed rather than trusting the 200", async () => {
  const applied = mockCtx([patched({ "terraform-version": "1.9.8" })]);
  const good = await action.execute(
    { workspaceId: "ws-1", terraformVersion: "1.9.8" },
    applied.ctx,
  ) as Record<string, unknown>;
  assertEquals(good.changed, ["terraform-version"]);
  assertEquals(good.unchanged, false);

  // 200, and the attribute came back as it was.
  const ignored = mockCtx([patched({ "terraform-version": "1.5.0" })]);
  const bad = await action.execute(
    { workspaceId: "ws-1", terraformVersion: "1.9.8" },
    ignored.ctx,
  ) as Record<string, unknown>;
  assertEquals(bad.changed, []);
  assertEquals(bad.unchanged, true);
  assertEquals(ignored.logs[0].level, "warn");
  assert(
    /did not apply every requested attribute/.test(ignored.logs[0].message),
    ignored.logs[0].message,
  );
});

/** Turning it on converts every future plan into an infrastructure change. */
Deno.test("workspace-update: turning auto-apply on needs an acknowledgement", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ workspaceId: "ws-1", autoApply: "true" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/set `confirmAutoApply`/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("workspace-update: turning auto-apply off is not gated", async () => {
  const { ctx, calls } = mockCtx([patched({ "auto-apply": false })]);
  const result = await action.execute({ workspaceId: "ws-1", autoApply: "false" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(JSON.parse(calls[0].body!).data.attributes["auto-apply"], false);
  assertEquals(result.changed, ["auto-apply"]);
});

Deno.test("workspace-update: turning it on with the acknowledgement warns", async () => {
  const { ctx, logs } = mockCtx([patched({ "auto-apply": true })]);
  await action.execute(
    { workspaceId: "ws-1", autoApply: "true", confirmAutoApply: true },
    ctx,
  );
  assert(logs.some((line) => /auto-apply is now ON/.test(line.message)), JSON.stringify(logs));
});

/** A PATCH with nothing in it is a request that cannot succeed at anything. */
Deno.test("workspace-update: refuses a PATCH with no settings", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ workspaceId: "ws-1" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/nothing to change/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("workspace-update: leaving auto-apply blank does not send it", async () => {
  const { ctx, calls } = mockCtx([patched({ description: "x" })]);
  await action.execute({ workspaceId: "ws-1", description: "x", autoApply: "" }, ctx);
  assertEquals("auto-apply" in JSON.parse(calls[0].body!).data.attributes, false);
});

Deno.test("workspace-update: the description names the silent no-op", () => {
  assert(
    /IGNORES an attribute it does not recognise/.test(action.description!),
    action.description,
  );
  assertEquals(action.idempotent, true);
});
