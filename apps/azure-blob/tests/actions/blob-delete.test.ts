import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/blob-delete.ts";

const D = { display: { account: "myaccount" } };

const policy = (days: number | null) => ({
  status: 200,
  body: `<StorageServiceProperties><DeleteRetentionPolicy>${
    days === null ? "<Enabled>false</Enabled>" : `<Enabled>true</Enabled><Days>${days}</Days>`
  }</DeleteRetentionPolicy></StorageServiceProperties>`,
});

Deno.test("blob-delete: reads the retention policy, then deletes", async () => {
  const { ctx, calls } = mockCtx([policy(7), { status: 202, body: "" }], D);
  const result = await action.execute(
    { container: "uploads", blob: "logs/a.log" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).searchParams.get("comp"), "properties");
  assertEquals(calls[1].method, "DELETE");
  assertEquals(
    new URL(calls[1].url).pathname,
    "/uploads/logs%2Fa.log",
  );
  assertEquals(result.deleted, true);
});

/** The response is identical either way, so the policy is what decides. */
Deno.test("blob-delete: reports whether soft delete can bring it back", async () => {
  const recoverable = mockCtx([policy(7), { status: 202, body: "" }], D);
  const kept = await action.execute(
    { container: "uploads", blob: "a.log" },
    recoverable.ctx,
  ) as Record<string, unknown>;
  assertEquals(kept.recoverable, true);
  assertEquals(kept.retentionDays, 7);
  assertEquals(recoverable.logs[0].level, "info");

  const gone = mockCtx([policy(null), { status: 202, body: "" }], D);
  const final = await action.execute(
    { container: "uploads", blob: "a.log" },
    gone.ctx,
  ) as Record<string, unknown>;
  assertEquals(final.recoverable, false);
  assertEquals(final.retentionDays, undefined);
  assertEquals(gone.logs[0].level, "warn");
  assert(/so it is gone/.test(gone.logs[0].message), gone.logs[0].message);
});

/** Reading service properties needs an account-level permission. */
Deno.test("blob-delete: not being able to read the policy is reported, not guessed", async () => {
  const { ctx, logs } = mockCtx([{ status: 403, body: "" }, { status: 202, body: "" }], D);
  const result = await action.execute(
    { container: "uploads", blob: "a.log" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.deleted, true);
  assertEquals(result.recoverable, false);
  assert(/could not be read/.test(logs[0].message), logs[0].message);
});

/** A blob with snapshots is a 409 without an instruction. */
Deno.test("blob-delete: the snapshot instruction is passed through when given", async () => {
  const { ctx, calls } = mockCtx([policy(7), { status: 202, body: "" }], D);
  const result = await action.execute(
    { container: "uploads", blob: "a.log", snapshots: "include" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[1].headers["x-ms-delete-snapshots"], "include");
  assertEquals(result.snapshots, "include");

  const plain = mockCtx([policy(7), { status: 202, body: "" }], D);
  await action.execute({ container: "uploads", blob: "a.log" }, plain.ctx);
  assertEquals(plain.calls[1].headers["x-ms-delete-snapshots"], undefined);
});

Deno.test("blob-delete: an ETag becomes the If-Match precondition", async () => {
  const { ctx, calls } = mockCtx([policy(7), { status: 202, body: "" }], D);
  await action.execute({ container: "uploads", blob: "a.log", ifMatch: '"0x8D"' }, ctx);
  assertEquals(calls[1].headers["if-match"], '"0x8D"');
});

Deno.test("blob-delete: says Azure has no default for snapshots", () => {
  assert(
    /refuses to be deleted until you say what happens to them/.test(action.description!),
    action.description,
  );
});
