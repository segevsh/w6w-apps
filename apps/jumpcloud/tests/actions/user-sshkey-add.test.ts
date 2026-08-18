import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-sshkey-add.ts";

const display = { display: { region: "us" } };
const KEY = "ssh-ed25519 AAAAC3Nza… ada@laptop";

Deno.test("user-sshkey-add: POSTs the name and public key", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { _id: "k1" } }], display);
  await action.execute!({ userId: "u1", name: "laptop", publicKey: KEY }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/systemusers/u1/sshkeys");
  assertEquals(JSON.parse(calls[0].body!), { name: "laptop", public_key: KEY });
});

/** This is a grant of shell access to every bound device, not a note. */
Deno.test("user-sshkey-add: logs at warn and is not idempotent", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: {} }], display);
  await action.execute!({ userId: "u1", name: "laptop", publicKey: KEY }, ctx);
  assertEquals(logs[0].level, "warn");
  assertEquals(action.idempotent, false);
});

/** A private key pasted here would be distributed to the fleet. */
Deno.test("user-sshkey-add: refuses something that looks like a private key", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(
    async () =>
      await action.execute!({
        userId: "u1",
        name: "laptop",
        publicKey: "-----BEGIN OPENSSH PRIVATE KEY-----\nabc\n-----END OPENSSH PRIVATE KEY-----",
      }, ctx),
    Error,
    "looks like a PRIVATE key",
  );
  assertEquals(calls.length, 0);
});

Deno.test("user-sshkey-add: every field is required, before any request", async () => {
  for (
    const [input, needle] of [
      [{ name: "l", publicKey: KEY }, "`userId`"],
      [{ userId: "u1", publicKey: KEY }, "`name`"],
      [{ userId: "u1", name: "l" }, "`publicKey`"],
    ] as const
  ) {
    const { ctx, calls } = mockCtx([], display);
    await assertRejects(async () => await action.execute!(input, ctx), Error, needle);
    assertEquals(calls.length, 0);
  }
});
