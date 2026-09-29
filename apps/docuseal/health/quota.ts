import type { HealthCheckDefinition } from "@w6w/types";

/**
 * How much of any rate limit is left?
 *
 * There is nothing to read. DocuSeal's OpenAPI document names no `429`
 * response on any path, and a live probe against `GET /templates?limit=1`
 * (both hosts, 2026-09-29, signed and unsigned) carried no `X-RateLimit-*`,
 * `RateLimit-*` or `Retry-After` header of any kind on a `200` or a `401`. A
 * vendor that exposes no readable counter or documented ceiling leaves
 * headroom unknowable rather than merely unread — probing further would mean
 * guessing at a header shape nothing on the wire confirms.
 * `severity: "informational"` — an `unavailable` entry always reports
 * `unknown`, and `unknown` outranks `ok` in a roll-up, so this keeps the
 * app's overall verdict from being pinned at `unknown` forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "DocuSeal documents no rate limit: no path in the OpenAPI document declares a 429 " +
      "response, and a live probe (2026-09-29, both hosts) carried no rate-limit header of any " +
      "kind on a 200 or a 401.",
  },
};

export default quota;
