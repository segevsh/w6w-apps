import { assert, assertEquals, assertRejects } from "@std/assert";
import type { ConnectionTarget, HandshakeStep, HookContext } from "@w6w/types";
import postgres from "../../auth/postgres.ts";
import { computeClientFinal, type ScramClientState } from "../../lib/scram.ts";
import { PROTOCOL_VERSION_3_0 } from "../../lib/wire.ts";
import {
  authCleartext,
  authMd5,
  authOk,
  authSasl,
  authSaslContinue,
  authSaslFinal,
  errorResponse,
} from "../_helpers.ts";

const noopCtx: HookContext = {
  fetch: (() => {
    throw new Error("handshake must never call ctx.fetch");
  }) as unknown as typeof fetch,
  log: () => {},
};

const target: ConnectionTarget = {
  host: "db.example.com",
  port: 5432,
  database: "acme",
  tlsMode: "verify-full",
};
const cred = { user: "alice", password: "pencil" };

/** Decode an SASLInitialResponse frame this hook produced, back into `{mechanism, message}`. */
function decodeSaslInitialResponse(buf: Uint8Array): { mechanism: string; message: string } {
  const mechEnd = buf.indexOf(0, 5);
  const mechanism = new TextDecoder().decode(buf.slice(5, mechEnd));
  const dataLen = new DataView(buf.buffer).getInt32(mechEnd + 1);
  const message = new TextDecoder().decode(buf.slice(mechEnd + 5, mechEnd + 5 + dataLen));
  return { mechanism, message };
}

/** Decode a SASLResponse frame this hook produced: tag `p`, Int32 length, raw data — no mechanism. */
function decodeSaslResponse(buf: Uint8Array): string {
  return new TextDecoder().decode(buf.slice(5));
}

/** Narrow a `HandshakeStep` to its `done: false` shape, failing the test loudly if it was `done: true`. */
function continuing(step: HandshakeStep): { send: Uint8Array; state: unknown } {
  if (step.done) throw new Error("expected `done: false`, got `done: true`");
  return { send: step.send, state: step.state };
}

Deno.test("auth/postgres: declares a custom auth with the expected fields", () => {
  assertEquals(postgres.type, "custom");
  const keys = postgres.fields!.map((f) => f.key);
  assertEquals(keys, [
    "host",
    "port",
    "database",
    "user",
    "password",
    "tlsMode",
    "caCert",
    "allowPrivate",
  ]);
  assertEquals(postgres.fields!.find((f) => f.key === "password")!.type, "secret");
  assert(typeof postgres.handshake === "function");
  assert(postgres.sign === undefined, "SCRAM is a handshake auth, never a sign-based one");
});

Deno.test("auth/postgres: exchange returns ONLY user/password, dropping the rest of the form", async () => {
  const credential = await postgres.exchange!(
    {
      fields: {
        host: "h",
        port: 5432,
        database: "d",
        user: "alice",
        password: "s3cr3t",
        tlsMode: "disable",
      },
    },
    noopCtx,
  );
  assertEquals(credential, { user: "alice", password: "s3cr3t" });
});

Deno.test("auth/postgres: test validates field presence but never claims a live check", async () => {
  assertEquals((await postgres.test({ credential: {} }, noopCtx)).ok, false);
  assertEquals((await postgres.test({ credential: { user: "a" } }, noopCtx)).ok, false);
  const ok = await postgres.test({ credential: cred }, noopCtx);
  assertEquals(ok.ok, true);
  assert(/no live check is possible/.test(ok.message!), ok.message);
});

Deno.test("auth/postgres: round 1 sends a well-formed StartupMessage carrying user + database", async () => {
  const step = continuing(await postgres.handshake!({ credential: cred, target }, noopCtx));
  const view = new DataView(step.send.buffer);
  assertEquals(view.getInt32(0), step.send.length);
  assertEquals(view.getInt32(4), PROTOCOL_VERSION_3_0);
  const body = new TextDecoder().decode(step.send.slice(8));
  assert(body.includes("user\0alice\0"), body);
  assert(body.includes("database\0acme\0"), body);
});

Deno.test("auth/postgres: AuthenticationOk right after startup finishes immediately (trust auth)", async () => {
  const first = continuing(await postgres.handshake!({ credential: cred, target }, noopCtx));
  const step = await postgres.handshake!(
    { credential: cred, target, received: authOk(), state: first.state },
    noopCtx,
  );
  assertEquals(step, { done: true });
});

/** (h) at the hook level — each unsupported method is refused with its OWN clear message, no fallthrough. */
Deno.test("auth/postgres: AuthenticationCleartextPassword and AuthenticationMD5Password are each refused distinctly", async () => {
  const first = continuing(await postgres.handshake!({ credential: cred, target }, noopCtx));
  await assertRejects(
    () =>
      Promise.resolve(
        postgres.handshake!({
          credential: cred,
          target,
          received: authCleartext(),
          state: first.state,
        }, noopCtx),
      ),
    Error,
    "AuthenticationCleartextPassword",
  );
  const secondFirst = continuing(await postgres.handshake!({ credential: cred, target }, noopCtx));
  await assertRejects(
    () =>
      Promise.resolve(
        postgres.handshake!({
          credential: cred,
          target,
          received: authMd5(),
          state: secondFirst.state,
        }, noopCtx),
      ),
    Error,
    "AuthenticationMD5Password",
  );
});

/** (i) at the hook level — an ErrorResponse mid-handshake surfaces its M field, not a generic failure. */
Deno.test("auth/postgres: an ErrorResponse mid-handshake surfaces its M field", async () => {
  const first = continuing(await postgres.handshake!({ credential: cred, target }, noopCtx));
  await assertRejects(
    () =>
      Promise.resolve(
        postgres.handshake!(
          {
            credential: cred,
            target,
            received: errorResponse({
              S: "FATAL",
              C: "28P01",
              M: 'password authentication failed for user "alice"',
            }),
            state: first.state,
          },
          noopCtx,
        ),
      ),
    Error,
    'password authentication failed for user "alice"',
  );
});

Deno.test("auth/postgres: a partial read is buffered in state, not treated as a full frame", async () => {
  const first = continuing(await postgres.handshake!({ credential: cred, target }, noopCtx));
  const saslFrame = authSasl(["SCRAM-SHA-256"]);
  const half = Math.floor(saslFrame.length / 2);

  const partial = continuing(
    await postgres.handshake!(
      { credential: cred, target, received: saslFrame.slice(0, half), state: first.state },
      noopCtx,
    ),
  );
  assertEquals(partial.send.length, 0, "no bytes are written while still waiting for more data");

  const completed = continuing(
    await postgres.handshake!(
      { credential: cred, target, received: saslFrame.slice(half), state: partial.state },
      noopCtx,
    ),
  );
  const decoded = decodeSaslInitialResponse(completed.send);
  assertEquals(decoded.mechanism, "SCRAM-SHA-256");
  assert(decoded.message.startsWith("n,,n=alice,r="));
});

/**
 * (e) at the **hook boundary**, not just `lib/scram.ts`'s `clientFirstMessage`. The hook's own
 * call site (`auth/postgres.ts:263`) relies on `clientFirstMessage`'s default third argument —
 * a mutant that pins a constant there instead would pass a lib-level nonce test perfectly while
 * every handshake this app ever drives sends the same client nonce. Read the nonce back off the
 * `r=` attribute of the SASLInitialResponse the hook itself produced, never off an internal call.
 */
Deno.test("auth/postgres: two independently-driven handshake first-steps produce different client nonces", async () => {
  async function clientNonceFromFreshHandshake(): Promise<string> {
    const first = continuing(await postgres.handshake!({ credential: cred, target }, noopCtx));
    const step2 = continuing(
      await postgres.handshake!(
        { credential: cred, target, received: authSasl(["SCRAM-SHA-256"]), state: first.state },
        noopCtx,
      ),
    );
    const { message } = decodeSaslInitialResponse(step2.send);
    return /r=([^,]+)$/.exec(message)![1];
  }

  const nonceA = await clientNonceFromFreshHandshake();
  const nonceB = await clientNonceFromFreshHandshake();
  assert(
    nonceA !== nonceB,
    `expected two independent handshakes to produce different client nonces, got the same value twice: ${nonceA}`,
  );
});

/** Full SCRAM round trip through the hook, glue-tested against `lib/scram.ts` as the oracle for what it SHOULD send. */
Deno.test("auth/postgres: completes a full SCRAM-SHA-256 round trip and verifies the server signature", async () => {
  const first = continuing(await postgres.handshake!({ credential: cred, target }, noopCtx));
  const step2 = continuing(
    await postgres.handshake!(
      { credential: cred, target, received: authSasl(["SCRAM-SHA-256"]), state: first.state },
      noopCtx,
    ),
  );
  const { message: clientFirstMessage } = decodeSaslInitialResponse(step2.send);
  const clientNonce = /r=([^,]+)$/.exec(clientFirstMessage)![1];
  const clientFirstMessageBare = clientFirstMessage.slice("n,,".length);

  // Act as the server: pick our own salt/iterations/server-nonce-suffix, and
  // use `lib/scram.ts` (independently vetted against the RFC vector in
  // scram.test.ts) to compute what a real server exchange would produce —
  // this only tests that `auth/postgres.ts`'s GLUE reaches the same answer
  // `lib/scram.ts` does, not the SCRAM arithmetic itself.
  const salt = "V0F0Q0hFRA=="; // arbitrary base64
  const serverFirstMessage = `r=${clientNonce}SERVERPART,s=${salt},i=4096`;
  const state: ScramClientState = { clientNonce, clientFirstMessageBare, password: cred.password };
  const oracle = await computeClientFinal(serverFirstMessage, state);

  const step3 = continuing(
    await postgres.handshake!(
      {
        credential: cred,
        target,
        received: authSaslContinue(serverFirstMessage),
        state: step2.state,
      },
      noopCtx,
    ),
  );
  assertEquals(decodeSaslResponse(step3.send), oracle.clientFinalMessage);

  const serverFinalMessage = `v=${btoa(String.fromCharCode(...oracle.expectedServerSignature))}`;
  const step4 = await postgres.handshake!(
    { credential: cred, target, received: authSaslFinal(serverFinalMessage), state: step3.state },
    noopCtx,
  );
  assertEquals(step4, { done: true });
});

/** Pinned mechanism 2, exercised through the full hook rather than `lib/scram.ts` directly. */
Deno.test("auth/postgres: rejects a corrupted ServerSignature at the final step", async () => {
  const first = continuing(await postgres.handshake!({ credential: cred, target }, noopCtx));
  const step2 = continuing(
    await postgres.handshake!(
      { credential: cred, target, received: authSasl(["SCRAM-SHA-256"]), state: first.state },
      noopCtx,
    ),
  );
  const { message: clientFirstMessage } = decodeSaslInitialResponse(step2.send);
  const clientNonce = /r=([^,]+)$/.exec(clientFirstMessage)![1];
  const serverFirstMessage = `r=${clientNonce}SERVERPART,s=V0F0Q0hFRA==,i=4096`;
  const step3 = continuing(
    await postgres.handshake!(
      {
        credential: cred,
        target,
        received: authSaslContinue(serverFirstMessage),
        state: step2.state,
      },
      noopCtx,
    ),
  );
  await assertRejects(
    () =>
      Promise.resolve(
        postgres.handshake!(
          {
            credential: cred,
            target,
            received: authSaslFinal("v=" + "A".repeat(43) + "="),
            state: step3.state,
          },
          noopCtx,
        ),
      ),
    Error,
    "FAILED",
  );
});
