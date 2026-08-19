import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/access-list-add.ts";

const added = { status: 201, body: { results: [{ cidrBlock: "203.0.113.0/24" }] } };

/** The request body is the array itself, not an object wrapping it. */
Deno.test("access-list-add: posts a bare array of entries", async () => {
  const { ctx, calls } = mockCtx([added]);
  await action.execute(
    { projectId: "5f8d0d55b54eff0f2b2c3d4e", value: "203.0.113.0/24", comment: "office" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assert(Array.isArray(body), "the body is an array");
  assertEquals(body[0].cidrBlock, "203.0.113.0/24");
  assertEquals(body[0].comment, "office");
});

/** A CIDR block and a bare address go in different fields. */
Deno.test("access-list-add: a bare address uses ipAddress, a block uses cidrBlock", async () => {
  const single = mockCtx([added]);
  await action.execute(
    { projectId: "5f8d0d55b54eff0f2b2c3d4e", value: "198.51.100.7", comment: "ci" },
    single.ctx,
  );
  const entry = JSON.parse(single.calls[0].body!)[0];
  assertEquals(entry.ipAddress, "198.51.100.7");
  assertEquals("cidrBlock" in entry, false);
});

/** One character's difference from adding a single office IP. */
Deno.test("access-list-add: 0.0.0.0/0 needs an explicit acknowledgement", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute(
      { projectId: "5f8d0d55b54eff0f2b2c3d4e", value: "0.0.0.0/0", comment: "deploy fix" },
      ctx,
    );
  } catch (err) {
    message = String(err);
  }
  assert(/set `confirmOpenToInternet`/.test(message), message);
  assert(/every address on the internet/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("access-list-add: an acknowledged 0.0.0.0/0 goes through and warns", async () => {
  const { ctx, logs } = mockCtx([added]);
  const result = await action.execute({
    projectId: "5f8d0d55b54eff0f2b2c3d4e",
    value: "0.0.0.0/0",
    comment: "deliberate",
    confirmOpenToInternet: true,
  }, ctx) as Record<string, unknown>;
  assertEquals(result.openToInternet, true);
  assertEquals(logs[0].level, "warn");
  assert(/entire internet/.test(logs[0].message), logs[0].message);
});

/** Nothing else will remember to remove what a workflow added. */
Deno.test("access-list-add: an entry with no expiry is warned about", async () => {
  const forever = mockCtx([added]);
  await action.execute(
    { projectId: "5f8d0d55b54eff0f2b2c3d4e", value: "203.0.113.0/24", comment: "office" },
    forever.ctx,
  );
  assertEquals(forever.logs[0].level, "warn");
  assert(/NO expiry/.test(forever.logs[0].message), forever.logs[0].message);

  const expiring = mockCtx([added]);
  const result = await action.execute({
    projectId: "5f8d0d55b54eff0f2b2c3d4e",
    value: "203.0.113.0/24",
    comment: "ci job",
    deleteAfterDate: "2026-09-01T00:00:00Z",
  }, expiring.ctx) as Record<string, unknown>;
  assertEquals(expiring.logs[0].level, "info");
  assertEquals(result.expiresAt, "2026-09-01T00:00:00Z");
  assertEquals(JSON.parse(expiring.calls[0].body!)[0].deleteAfterDate, "2026-09-01T00:00:00Z");
});

/** An access list of unexplained CIDR blocks can never be pruned. */
Deno.test("access-list-add: a comment is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e", value: "203.0.113.4" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`comment` is required/.test(message), message);
  assert(/ever safely prune/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("access-list-add: a value is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e", comment: "x" }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
  assertEquals(calls.length, 0);
});

/** There is no per-cluster access list. */
Deno.test("access-list-add: says the entry covers every cluster in the project", () => {
  assert(/ALL of them, present and\s+future/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});
