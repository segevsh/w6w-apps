import type { ActionDefinition } from "@w6w/types";
import { json, tailnetFrom, TailscaleClient } from "../lib/client.ts";

/**
 * `POST /api/v2/tailnet/{tailnet}/acl/validate` — ask whether access would be
 * allowed, without changing anything.
 *
 * ## Two modes in one endpoint
 *
 * - Send an **array**, and Tailscale runs those as ACL tests against the
 *   policy file that is live right now: can `dave@example.com` reach
 *   `tag:prod:22`?
 * - Send an **object**, and Tailscale treats it as a hypothetical policy file
 *   — parses it, and runs its tests — without installing it.
 *
 * Neither modifies the tailnet. That makes this the safe half of policy
 * automation and the reason this app has no "set the policy file" action: a
 * workflow can *check* a proposed policy in CI and let a human merge it, which
 * is where a change to who can reach what belongs.
 *
 * ## What a passing test actually proves
 *
 * That the rules as written permit the access. It says nothing about whether
 * the device is online, its key is valid, or the route is enabled — every one
 * of which produces "cannot connect" with a perfectly healthy ACL. This is a
 * check on the policy, not on the network.
 */
const action: ActionDefinition = {
  key: "acl-validate",
  type: "perform",
  resource: "acl",
  title: "Validate policy, or run ACL tests",
  description:
    "Ask whether access would be allowed, changing NOTHING. Send tests to run them against the " +
    "live policy file, or a whole policy file to check one before anybody installs it — the safe " +
    "half of policy automation, and the reason this app cannot write policy files.",
  idempotent: true,
  params: [
    {
      key: "tests",
      label: "ACL tests",
      type: "json",
      default: "",
      placeholder: '[{"src":"dave@example.com","accept":["tag:prod:22"]}]',
      hint: "An array of tests, run against the policy file as it is now. Each has a `src` and " +
        "`accept` and/or `deny` list.",
    },
    {
      key: "policy",
      label: "Hypothetical policy file",
      type: "json",
      default: "",
      hint: "A whole policy file as JSON. Parsed and tested, never installed. Note JSON cannot " +
        "carry the comments a real policy file has.",
    },
  ],
  output: [
    { key: "valid", type: "boolean", label: "Whether it passed" },
    { key: "mode", type: "string", label: "tests or policy" },
    { key: "message", type: "string", label: "What Tailscale said" },
    { key: "errors", type: "array", label: "Parse failures, if a policy was sent" },
    { key: "warnings", type: "array", label: "Rules that parse and grant access to nobody" },
    { key: "response", type: "object", label: "The reply verbatim" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const tailnet = tailnetFrom(ctx.connection);

    const tests = json(p.tests, "tests");
    const policy = json(p.policy, "policy");
    if (tests === undefined && policy === undefined) {
      throw new Error(
        "supply either `tests` to run against the live policy file, or `policy` " +
          "to validate a proposed one",
      );
    }
    if (tests !== undefined && policy !== undefined) {
      throw new Error(
        "supply `tests` or `policy`, not both — Tailscale chooses its mode from the shape of " +
          "the body, so sending both would silently discard one",
      );
    }
    if (tests !== undefined && !Array.isArray(tests)) {
      throw new Error(
        "`tests` must be an ARRAY — Tailscale reads an object as a hypothetical policy file " +
          "instead, and would validate it rather than running your tests",
      );
    }

    const body = tests ?? policy;
    const mode = tests !== undefined ? "tests" : "policy";

    let response: unknown;
    let valid = true;
    let message = mode === "tests"
      ? "every test passed against the live policy file"
      : "the proposed policy file parses and its tests pass";
    try {
      response = await new TailscaleClient(ctx).request(
        `/tailnet/${encodeURIComponent(tailnet)}/acl/validate`,
        { method: "POST", body },
      );
    } catch (err) {
      // A failing test is an answer, not an outage.
      valid = false;
      message = String(err instanceof Error ? err.message : err);
      response = undefined;
    }

    const detail = response as { message?: string; errors?: string[]; warnings?: string[] } | null;
    // Tailscale can also answer 200 with the failure described in the body.
    if (detail?.message || detail?.errors?.length) {
      valid = false;
      message = detail?.message ?? message;
    }

    return {
      valid,
      mode,
      message,
      errors: detail?.errors ?? [],
      warnings: detail?.warnings ?? [],
      response,
    };
  },
};

export default action;
