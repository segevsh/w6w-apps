import type { AuthDefinition, HandshakeStep } from "@w6w/types";
import {
  clientFirstMessage,
  computeClientFinal,
  decodeUtf8 as decodeUtf8Scram,
  type ScramClientState,
  verifyServerFinalMessage,
} from "../lib/scram.ts";
import {
  type BackendFrame,
  encodeSASLInitialResponse,
  encodeSASLResponse,
  encodeStartupMessage,
  FrameReader,
  parseAuthentication,
  parseErrorResponse,
} from "../lib/wire.ts";

/**
 * The credential is a username and a cleartext password to a Postgres
 * database — access to every table that role can read, and every table it
 * can write. There is no scoping this app can add: PostgreSQL's own
 * privilege model (roles, `GRANT`, row-level security) is what limits the
 * blast radius, and it lives entirely on the server, invisible to this
 * connect form. A leaked credential here is as bad as a leaked credential
 * ever gets for whatever that role can reach.
 *
 * ## Why `handshake`, not `sign`
 *
 * `azure-blob/auth/shared-key.ts`'s `sign` hook computes a whole HMAC
 * signature from the request already in front of it — nothing about Shared
 * Key depends on a prior reply from Azure. SCRAM structurally cannot work
 * that way: the client's second message (`client-final`) is a function of
 * values the SERVER chooses at handshake time (its own nonce contribution,
 * the salt, the iteration count), so there is no single request this hook
 * could sign in one shot. `handshake` is the ABI's answer — an iterative,
 * network-less hook the host drives one protocol round trip at a time,
 * threading whatever state survives between round trips through
 * `HandshakeStep.state` (never module-level variables: this hook runs once
 * per round trip, in a fresh call, and must be a pure function of its
 * input every time).
 *
 * ## What this hook does NOT do
 *
 * It never touches `ctx.fetch` or `ctx.socket` — both are absent from its
 * `ctx` per the Hook Runtime RFC's sandbox posture table, which is also
 * exactly why `test` below cannot make a live connectivity check: there is
 * no ABI-level capability an auth-phase hook has for a raw socket protocol.
 * It never sees `host`/`port` — only `target` (read-only) — so it cannot
 * redirect the connection; the one pre-connect target check the host
 * performs uses the SAME `Connection.target` this hook merely reads.
 */
interface PostgresCredential {
  user: string;
  password: string;
}

/**
 * State threaded across the four round trips this handshake takes for a
 * SCRAM login: StartupMessage -> AuthenticationSASL -> AuthenticationSASLContinue
 * -> AuthenticationSASLFinal. `buf` is this call's leftover, not-yet-parsed
 * bytes (see the doc comment on `nextFrame` below) — carrying it in `state`
 * rather than a module-level variable is what keeps this hook pure.
 */
type HandshakeState =
  | { phase: "await-auth-request"; buf?: Uint8Array }
  | (ScramClientState & { phase: "await-sasl-continue"; buf?: Uint8Array })
  | { phase: "await-sasl-final"; expectedServerSignature: Uint8Array; buf?: Uint8Array };

/**
 * Extract exactly one complete frame from `received`, prepending any bytes
 * left over from a previous call. Mirrors `lib/wire.ts`'s `FrameReader` —
 * duplicated in miniature here (rather than importing `FrameReader` as a
 * long-lived instance) because `HandshakeStep.state` must be plain,
 * structured-cloneable data, and a `FrameReader` instance is a class with
 * private fields, not a value the ABI can carry between calls. When there is
 * not yet a complete frame, this returns `null` and the caller must respond
 * with an EMPTY `send` (a zero-length write is a legal no-op) so the host
 * loops back for another read without prodding the server — the same
 * "reassemble from a buffer, never assume one read is one message" rule
 * pinned mechanism 3 states for `actions/query.ts`'s own read loop, applied
 * here to the handshake's round trips instead.
 */
function nextFrame(
  previousBuf: Uint8Array | undefined,
  received: Uint8Array | undefined,
): { frame: BackendFrame; leftover: Uint8Array } | { frame: null; leftover: Uint8Array } {
  const reader = new FrameReader();
  if (previousBuf?.length) reader.push(previousBuf);
  if (received?.length) reader.push(received);
  const frame = reader.next();
  // Whatever FrameReader still holds after that ONE frame is carried
  // forward into the next call's `state.buf` — covers both "not enough
  // buffered yet" (frame is null, the whole buffer is the leftover) and a
  // server that pipelines a second message into the same read as the one
  // this round trip needed (frame is non-null, the leftover is that second
  // message's bytes, not yet parsed).
  const leftover = reader.drain();
  if (!frame) return { frame: null, leftover };
  return { frame, leftover };
}

const SCRAM_MECHANISM = "SCRAM-SHA-256";

function refuseFrame(frame: BackendFrame): never {
  if (frame.type === "E") {
    throw new Error(`postgres: ${parseErrorResponse(frame).message}`);
  }
  throw new Error(
    `postgres: unexpected frame type ${JSON.stringify(frame.type)} during the SCRAM handshake`,
  );
}

const postgres: AuthDefinition = {
  key: "postgres",
  type: "custom",
  displayName: "PostgreSQL Connection",
  description: "Host, port, database and credentials for a PostgreSQL server. Authenticates with " +
    "SCRAM-SHA-256 — the default since PostgreSQL 10. `md5` and cleartext password auth are " +
    "refused outright rather than silently attempted.",
  connectionLabel: "{{user}}@{{host}}/{{database}}",
  fields: [
    {
      key: "host",
      label: "Host",
      type: "string",
      required: true,
      row: "target",
      placeholder: "db.example.com",
    },
    {
      key: "port",
      label: "Port",
      type: "number",
      required: true,
      default: 5432,
      row: "target",
      validation: { integer: true, min: 1, max: 65535 },
    },
    { key: "database", label: "Database", type: "string", required: true, placeholder: "postgres" },
    { key: "user", label: "Username", type: "string", required: true, row: "credential" },
    { key: "password", label: "Password", type: "secret", required: true, row: "credential" },
    {
      key: "tlsMode",
      label: "TLS",
      type: "select",
      required: true,
      default: "verify-full",
      options: [
        { value: "verify-full", label: "Verify (system trust store)" },
        { value: "custom-ca", label: "Verify against a custom CA" },
        { value: "disable", label: "Disable (insecure — not recommended)" },
      ],
      hint: "Verified against the system trust store by default. Disabling verification is an " +
        "explicit, deliberate opt-in, never the default for a credential this powerful.",
    },
    {
      key: "caCert",
      label: "Custom CA certificate (PEM)",
      type: "text",
      config: { multiline: true },
      advanced: true,
      showIf: { "==": [{ var: "tlsMode" }, "custom-ca"] },
      hint: 'Required when TLS is set to "Verify against a custom CA".',
    },
    {
      key: "allowPrivate",
      label: "Allow a loopback / private-range target",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Off by default: the host refuses a target that resolves to loopback or a private " +
        "range unless this is explicitly turned on.",
    },
  ],

  /**
   * Only `user`/`password` become the opaque, encrypted `credential` — the
   * rest of the form (`host`/`port`/`database`/`tlsMode`/`caCert`/
   * `allowPrivate`) is non-secret and becomes `Connection.target`
   * (Connection RFC), which is assembled by the HOST from the same
   * submitted form, not by this hook. This app never builds a
   * `ConnectionTarget` itself — see the README's "Two halves of one form"
   * section for why that split exists (DC-2: the host must be able to read
   * host/port/tlsMode to run its pre-connect check without ever decrypting
   * `credential`).
   */
  exchange({ fields }) {
    const user = typeof fields?.user === "string" ? fields.user : "";
    const password = typeof fields?.password === "string" ? fields.password : "";
    return { user, password } satisfies PostgresCredential;
  },

  /**
   * Cannot make a live connectivity check: `ctx.socket` is absent from
   * every auth-phase hook (Hook Runtime RFC's sandbox posture table), and
   * `ctx.fetch` is useless against a raw TCP protocol. This validates only
   * that the credential's shape is plausible — a real liveness check
   * happens the first time a Connection is actually used, when the host
   * drives `handshake` for real. Documented here rather than left to look
   * like an oversight.
   */
  test({ credential }) {
    const cred = credential as Partial<PostgresCredential> | undefined;
    if (!cred?.user) return { ok: false, message: "credential is missing the username" };
    if (!cred?.password) return { ok: false, message: "credential is missing the password" };
    return {
      ok: true,
      message: "credential shape looks valid (no live check is possible from this hook — see " +
        "the doc comment above `test` in auth/postgres.ts)",
    };
  },

  /**
   * Drives StartupMessage -> SCRAM-SHA-256 to completion, one protocol round
   * trip per call. See the module doc comment for why this is `handshake`
   * and not `sign`, and pinned mechanism 2 for why the final step MUST
   * verify the server's `v=` before returning `done: true`.
   */
  async handshake(input) {
    const cred = input.credential as PostgresCredential;
    const state = input.state as HandshakeState | undefined;

    if (!state) {
      // Round 1: no reply to read yet — send StartupMessage.
      const params: Record<string, string> = { user: cred.user };
      if (input.target.database) params.database = input.target.database;
      return {
        done: false,
        send: encodeStartupMessage(params),
        state: { phase: "await-auth-request" } satisfies HandshakeState,
      } satisfies HandshakeStep;
    }

    if (state.phase === "await-auth-request") {
      const { frame, leftover } = nextFrame(state.buf, input.received);
      if (!frame) {
        return { done: false, send: new Uint8Array(0), state: { ...state, buf: leftover } };
      }
      if (frame.type === "E") refuseFrame(frame);
      const auth = parseAuthentication(frame);
      switch (auth.kind) {
        case "ok":
          // Trust auth (or the server otherwise needs no password) — done.
          return { done: true };
        case "cleartext-password":
          throw new Error(
            "postgres: server requested AuthenticationCleartextPassword — refused. Only " +
              "SCRAM-SHA-256 is supported by this app; cleartext password auth is not attempted.",
          );
        case "md5-password":
          throw new Error(
            "postgres: server requested AuthenticationMD5Password — refused. Only SCRAM-SHA-256 " +
              "is supported by this app; md5 auth is not attempted.",
          );
        case "sasl": {
          if (!auth.mechanisms.includes(SCRAM_MECHANISM)) {
            throw new Error(
              `postgres: server does not offer ${SCRAM_MECHANISM} (offered: ` +
                `${auth.mechanisms.join(", ") || "none"}) — refusing to authenticate`,
            );
          }
          const { message, state: scramState } = clientFirstMessage(cred.user, cred.password);
          return {
            done: false,
            send: encodeSASLInitialResponse(SCRAM_MECHANISM, new TextEncoder().encode(message)),
            state: {
              phase: "await-sasl-continue",
              ...scramState,
              buf: leftover.length ? leftover : undefined,
            } satisfies HandshakeState,
          };
        }
        default:
          throw new Error(
            `postgres: unexpected Authentication message (kind ${JSON.stringify(auth)}) ` +
              "immediately after StartupMessage",
          );
      }
    }

    if (state.phase === "await-sasl-continue") {
      const { frame, leftover } = nextFrame(state.buf, input.received);
      if (!frame) {
        return { done: false, send: new Uint8Array(0), state: { ...state, buf: leftover } };
      }
      if (frame.type === "E") refuseFrame(frame);
      const auth = parseAuthentication(frame);
      if (auth.kind !== "sasl-continue") {
        throw new Error(
          `postgres: expected AuthenticationSASLContinue, got ${JSON.stringify(auth)}`,
        );
      }
      const serverFirstMessage = decodeUtf8Scram(auth.data);
      const scramState: ScramClientState = {
        clientNonce: state.clientNonce,
        clientFirstMessageBare: state.clientFirstMessageBare,
        password: state.password,
      };
      const { clientFinalMessage, expectedServerSignature } = await computeClientFinal(
        serverFirstMessage,
        scramState,
      );
      return {
        done: false,
        send: encodeSASLResponse(new TextEncoder().encode(clientFinalMessage)),
        state: {
          phase: "await-sasl-final",
          expectedServerSignature,
          buf: leftover.length ? leftover : undefined,
        } satisfies HandshakeState,
      };
    }

    // state.phase === "await-sasl-final"
    const { frame, leftover } = nextFrame(state.buf, input.received);
    if (!frame) {
      return { done: false, send: new Uint8Array(0), state: { ...state, buf: leftover } };
    }
    if (frame.type === "E") refuseFrame(frame);
    const auth = parseAuthentication(frame);
    if (auth.kind !== "sasl-final") {
      throw new Error(`postgres: expected AuthenticationSASLFinal, got ${JSON.stringify(auth)}`);
    }
    const serverFinalMessage = decodeUtf8Scram(auth.data);
    // Pinned mechanism 2 — verified in constant time, and the ONLY way this
    // function returns `done: true` after a SCRAM exchange.
    verifyServerFinalMessage(serverFinalMessage, state.expectedServerSignature);
    return { done: true };
  },
};

export default postgres;
