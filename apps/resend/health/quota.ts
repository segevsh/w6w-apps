/**
 * How much headroom is left — Resend publishes nothing to read.
 *
 * Checked in three places before being written off, because the limit itself is
 * real and low enough to matter:
 *
 *   - **Resend's API reference** (fetched 2026-08-18) states the limit as "10
 *     requests per second per team … applies across all API keys associated
 *     with your team", says it can be raised for trusted senders on request,
 *     and points at the Settings → Usage page in the dashboard. It names **no
 *     response header** and no endpoint that reports consumption.
 *   - **Resend's OpenAPI document** (v1.5.0) declares no response headers
 *     anywhere in its 47 paths, and no `429` response on any operation — so
 *     there is nothing documented for a probe to read.
 *   - **A live call** carries none either: the unauthenticated `GET /emails`
 *     answers `401` with no `ratelimit-*` headers at all.
 *
 * A per-second ceiling is also the wrong shape for a periodic probe even if it
 * were readable: by the time a check reported it, the window would be over.
 * Exhaustion surfaces as a `429` on the next call, which the client already
 * raises with Resend's own `name` code intact.
 *
 * Declared rather than omitted: a host should be able to tell "we cannot know"
 * from "nobody looked". `severity: "informational"` because an `unavailable`
 * entry always reports `unknown`, and an informational check never worsens a
 * roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Resend meters 10 requests/second per team across all of the team's API keys, but " +
      "publishes no headroom endpoint and no rate-limit response headers: its OpenAPI " +
      "document declares no response headers and no 429 on any of its 47 paths, its API " +
      "reference names none, and a live unauthenticated call returns no `ratelimit-*` " +
      "(verified 2026-08-18). A per-second window is also too short for a periodic probe to " +
      "report usefully; exhaustion surfaces as a 429 on the next call.",
  },
};

export default quota;
