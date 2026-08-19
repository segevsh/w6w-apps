import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/droplet-create.ts";

const created = {
  status: 202,
  body: {
    droplet: { id: 3164444, status: "new" },
    links: { actions: [{ id: 7654321, rel: "create" }] },
  },
};

const base = {
  name: "web-1",
  region: "fra1",
  size: "s-1vcpu-1gb",
  image: "ubuntu-24-04-x64",
  sshKeys: "12345",
};

/** A 202 is a droplet that exists and does not work yet. */
Deno.test("droplet-create: reports the droplet as not ready", async () => {
  const { ctx, calls } = mockCtx([created]);
  const result = await action.execute(base, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(result.id, 3164444);
  assertEquals(result.status, "new");
  assertEquals(result.ready, false);
  assertEquals(result.actionId, 7654321);
  assert(/NOT READY/.test(action.description!), action.description);
});

/** Without a key, a root password is emailed in plain text. */
Deno.test("droplet-create: no SSH key needs an acknowledgement, and says what happens", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ ...base, sshKeys: "" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/set `confirmNoSshKeys`/.test(message), message);
  assert(/EMAILS IT IN PLAIN TEXT/.test(message), message);
  assert(/password authentication enabled/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("droplet-create: an acknowledged password droplet warns", async () => {
  const { ctx, logs } = mockCtx([created]);
  const result = await action.execute(
    { ...base, sshKeys: "", confirmNoSshKeys: true },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.passwordEmailed, true);
  assertEquals(logs[0].level, "warn");
  assert(/emailed in plain text/.test(logs[0].message), logs[0].message);
});

/** Free, and off by default in the API. */
Deno.test("droplet-create: monitoring defaults on and backups default off", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute(base, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.monitoring, true);
  assertEquals(body.backups, false);
  assertEquals(action.params!.find((p) => p.key === "monitoring")!.default, true);
});

Deno.test("droplet-create: a numeric image is sent as a number", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute({ ...base, image: "123456789" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).image, 123456789);

  const slug = mockCtx([created]);
  await action.execute(base, slug.ctx);
  assertEquals(JSON.parse(slug.calls[0].body!).image, "ubuntu-24-04-x64");
});

Deno.test("droplet-create: SSH keys and tags are sent as arrays", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute({ ...base, sshKeys: "12345, ab:cd", tags: "web, prod" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.ssh_keys, ["12345", "ab:cd"]);
  assertEquals(body.tags, ["web", "prod"]);
});

Deno.test("droplet-create: every required field is checked", async () => {
  for (const field of ["name", "region", "size", "image"]) {
    const { ctx, calls } = mockCtx([]);
    let message = "";
    try {
      await action.execute({ ...base, [field]: "" }, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(new RegExp(`\`${field}\` is required`).test(message), message);
    assertEquals(calls.length, 0);
  }
});

/** Cloud-init is readable from the droplet's own metadata service. */
Deno.test("droplet-create: says user data is not a place for secrets", () => {
  const userData = action.params!.find((p) => p.key === "userData")!;
  assert(/not a place for secrets/.test(userData.hint!), userData.hint);
  assertEquals(action.idempotent, false);
});
