import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workspace-create.ts";

const created = (attributes: Record<string, unknown> = {}) => ({
  status: 201,
  body: {
    data: { type: "workspaces", id: "ws-new", attributes: { name: "prod", ...attributes } },
  },
});

Deno.test("workspace-create: posts a JSON:API document to the organisation", async () => {
  const { ctx, calls } = mockCtx([created()]);
  const result = await action.execute({ organization: "acme", name: "prod" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].url, "https://app.terraform.io/api/v2/organizations/acme/workspaces");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.type, "workspaces");
  assertEquals(body.data.attributes.name, "prod");
  assertEquals(result.id, "ws-new");
});

/** Attribute names are kebab-case; snake_case is accepted and ignored. */
Deno.test("workspace-create: sends kebab-case attribute names", async () => {
  const { ctx, calls } = mockCtx([created()]);
  await action.execute({
    organization: "acme",
    name: "prod",
    terraformVersion: "1.9.8",
    executionMode: "agent",
    workingDirectory: "infra",
  }, ctx);
  const attributes = JSON.parse(calls[0].body!).data.attributes;
  assertEquals(attributes["terraform-version"], "1.9.8");
  assertEquals(attributes["execution-mode"], "agent");
  assertEquals(attributes["working-directory"], "infra");
  assertEquals(attributes["terraform_version"], undefined);
});

/** A dropped `auto-apply: false` would be the dangerous direction. */
Deno.test("workspace-create: auto-apply is sent explicitly, false included", async () => {
  const off = mockCtx([created()]);
  await action.execute({ organization: "acme", name: "prod" }, off.ctx);
  assertEquals(JSON.parse(off.calls[0].body!).data.attributes["auto-apply"], false);
  assertEquals(off.logs[0].level, "info");

  const on = mockCtx([created({ "auto-apply": true })]);
  const result = await action.execute(
    { organization: "acme", name: "prod", autoApply: true },
    on.ctx,
  ) as Record<string, unknown>;
  assertEquals(JSON.parse(on.calls[0].body!).data.attributes["auto-apply"], true);
  assertEquals(result.autoApply, true);
  assertEquals(on.logs[0].level, "warn");
  assert(/apply themselves/.test(on.logs[0].message), on.logs[0].message);
});

Deno.test("workspace-create: defaults execution mode to remote", async () => {
  const { ctx, calls } = mockCtx([created()]);
  await action.execute({ organization: "acme", name: "prod" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).data.attributes["execution-mode"], "remote");
});

/** A new minor version can break a configuration that planned cleanly. */
Deno.test("workspace-create: an unpinned version is left unset, and the hint says why", async () => {
  const { ctx, calls } = mockCtx([created()]);
  await action.execute({ organization: "acme", name: "prod", terraformVersion: "" }, ctx);
  assertEquals("terraform-version" in JSON.parse(calls[0].body!).data.attributes, false);
  const version = action.params!.find((p) => p.key === "terraformVersion")!;
  assert(/tracks the newest release/.test(version.hint!), version.hint);
});

Deno.test("workspace-create: an organisation and a name are both required", async () => {
  for (const input of [{ name: "prod" }, { organization: "acme" }]) {
    const { ctx, calls } = mockCtx([]);
    let message = "";
    try {
      await action.execute(input, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(/is required/.test(message), message);
    assertEquals(calls.length, 0);
  }
});

Deno.test("workspace-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
