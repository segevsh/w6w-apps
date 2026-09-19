import { assert, assertEquals, assertNotEquals, assertRejects, assertThrows } from "@std/assert";
import {
  clientFirstMessage,
  computeClientFinal,
  escapeSaslName,
  MIN_SCRAM_ITERATIONS,
  type ScramClientState,
  timingSafeEqual,
  verifyServerFinalMessage,
} from "../../lib/scram.ts";

/**
 * RFC 7677 §3's own published SCRAM-SHA-256 exchange — transcribed from the
 * RFC text, not derived from this file's output. Independently recomputed
 * in Python during authoring (PBKDF2-HMAC-SHA256 + the HMAC chain, straight
 * from RFC 5802 §3's algorithm description) to confirm the RFC's own
 * numbers are internally consistent before pinning them here — see this
 * node's result for that computation. This is the only oracle available
 * without a live server (contract §Unpinned item 2), so it is what proves
 * the ARITHMETIC; it does not and cannot prove this implementation talks to
 * a real PostgreSQL server correctly.
 */
const VECTOR = {
  username: "user",
  password: "pencil",
  clientNonce: "rOprNGfwEbeRWgbNEkqO",
  clientFirstMessage: "n,,n=user,r=rOprNGfwEbeRWgbNEkqO",
  serverFirstMessage:
    "r=rOprNGfwEbeRWgbNEkqO%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0,s=W22ZaJ0SNY7soEsUEjb6gQ==,i=4096",
  clientFinalMessage: "c=biws,r=rOprNGfwEbeRWgbNEkqO%hvYDpWUa2RaTCAfuxFIlj)hNlF$k0," +
    "p=dHzbZapWIk4jUhN+Ute9ytag9zjfMHgsqmmiz7AndVQ=",
  serverFinalMessage: "v=6rriTRBi23WpRR/wtup+mMhUZUn/dB5nLTJRsjl95G4=",
};

/** (a) — the arithmetic, against an oracle outside this repo. */
Deno.test("scram: reproduces RFC 7677 §3's exchange byte-for-byte", async () => {
  const first = clientFirstMessage(VECTOR.username, VECTOR.password, VECTOR.clientNonce);
  assertEquals(first.message, VECTOR.clientFirstMessage);

  const final = await computeClientFinal(VECTOR.serverFirstMessage, first.state);
  assertEquals(final.clientFinalMessage, VECTOR.clientFinalMessage);

  // Does not throw — the vector's own v= is exactly what we computed.
  verifyServerFinalMessage(VECTOR.serverFinalMessage, final.expectedServerSignature);
});

/**
 * (b) — pinned mechanism 2. A corrupted `v=` must be REJECTED even though
 * everything up to it (the vector in (a)) is otherwise byte-perfect. This is
 * the assertion that would fail on an implementation that authenticates but
 * never checks the server's signature — (a) alone cannot catch that bug,
 * because a happy-path vector test is *greener*, not redder, without the
 * check.
 */
Deno.test("scram: a corrupted server signature is rejected", async () => {
  const first = clientFirstMessage(VECTOR.username, VECTOR.password, VECTOR.clientNonce);
  const final = await computeClientFinal(VECTOR.serverFirstMessage, first.state);
  const corrupted = "v=" + "A".repeat(43) + "=";
  assertThrows(
    () => verifyServerFinalMessage(corrupted, final.expectedServerSignature),
    Error,
    "FAILED",
  );
});

/** (c) — the named SCRAM abort condition (RFC 5802 §5.1). */
Deno.test("scram: a server nonce not prefixed by the client nonce throws", async () => {
  const first = clientFirstMessage(VECTOR.username, VECTOR.password, VECTOR.clientNonce);
  const badServerFirst = "r=totally-different-nonce,s=W22ZaJ0SNY7soEsUEjb6gQ==,i=4096";
  await assertRejects(
    () => computeClientFinal(badServerFirst, first.state),
    Error,
    "does not start with the client nonce",
  );
});

/** (d) — the escaping arm: `,` and `=` are both replaced, in one pass. */
Deno.test("scram: a username containing `,` and `=` is escaped as =2C / =3D", () => {
  assertEquals(escapeSaslName("a,b=c"), "a=2Cb=3Dc");
  assertEquals(escapeSaslName("==,,"), "=3D=3D=2C=2C");
  const first = clientFirstMessage("weird,=name", "pw", "fixed-nonce");
  assertEquals(first.message, "n,,n=weird=2C=3Dname,r=fixed-nonce");
});

/** (e) — `crypto.getRandomValues`, not a constant. A fixed nonce passes (a) perfectly. */
Deno.test("scram: two successive first messages produce different client nonces", () => {
  const a = clientFirstMessage("user", "pencil");
  const b = clientFirstMessage("user", "pencil");
  assertNotEquals(a.state.clientNonce, b.state.clientNonce);
});

Deno.test("scram: an iteration count below the floor is refused", async () => {
  const first = clientFirstMessage(VECTOR.username, VECTOR.password, VECTOR.clientNonce);
  const cheap = `r=${VECTOR.clientNonce}abc,s=W22ZaJ0SNY7soEsUEjb6gQ==,i=1`;
  await assertRejects(
    () => computeClientFinal(cheap, first.state),
    Error,
    `below the accepted floor of ${MIN_SCRAM_ITERATIONS}`,
  );
});

Deno.test("scram: a malformed server-first-message (missing s=/i=/r=) throws", async () => {
  const state: ScramClientState = {
    clientNonce: "abc",
    clientFirstMessageBare: "n=user,r=abc",
    password: "pencil",
  };
  await assertRejects(() => computeClientFinal("r=abc", state), Error, "malformed");
});

Deno.test("scram: verifyServerFinalMessage surfaces a server-sent e= error", () => {
  assertThrows(
    () => verifyServerFinalMessage("e=other-error", new Uint8Array(32)),
    Error,
    "other-error",
  );
});

Deno.test("scram: timingSafeEqual compares equal and unequal byte strings, including length mismatches", () => {
  const a = new Uint8Array([1, 2, 3]);
  const b = new Uint8Array([1, 2, 3]);
  const c = new Uint8Array([1, 2, 4]);
  const shorter = new Uint8Array([1, 2]);
  assert(timingSafeEqual(a, b));
  assert(!timingSafeEqual(a, c));
  assert(!timingSafeEqual(a, shorter));
});
