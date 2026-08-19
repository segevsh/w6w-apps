import type { ActionDefinition } from "@w6w/types";
import { query, tailnetFrom, TailscaleClient } from "../lib/client.ts";

/**
 * `GET /api/v2/tailnet/{tailnet}/acl` — the policy file, which is the whole of
 * who may reach what.
 *
 * ## It is HuJSON, and asking for JSON throws away the comments
 *
 * The policy file is JSON with comments and trailing commas — HuJSON. The
 * endpoint will return it either way depending on the `Accept` header, and
 * the JSON form is *lossy*: every comment is gone.
 *
 * That matters because a Tailscale policy file is mostly explanation. Read it
 * as JSON, edit it, write it back, and a team's accumulated reasoning about
 * why each rule exists disappears in a diff that looks like a formatting
 * change. This action returns the **HuJSON verbatim** by default and offers
 * the parsed JSON as a separate, explicitly lossy option.
 *
 * ## `details=true` reports rules that parse and mean nothing
 *
 * Tailscale distinguishes *errors* (the file does not parse) from **warnings**
 * — "syntactically valid but nonsensical entries", such as a group listing a
 * user who does not exist. Those are the interesting ones: the policy file is
 * accepted, the rule is live, and the access it was meant to grant goes to
 * nobody. Nothing surfaces them except asking.
 *
 * ## This app reads the policy file and does not write it
 *
 * A change to who may reach what belongs in a reviewed commit, not in a
 * workflow step. `acl-validate` checks a proposed file without installing it,
 * which is the half of policy automation that is safe to hand to a machine.
 */
const action: ActionDefinition = {
  key: "acl-get",
  type: "read",
  resource: "acl",
  title: "Get the policy file",
  description:
    "The tailnet policy file — every access rule there is. Returned as HUJSON verbatim, because " +
    "the JSON form drops every comment and a policy file is mostly explanation. Reports " +
    "Tailscale's WARNINGS: rules that parse and grant access to nobody.",
  params: [
    {
      key: "includeParsed",
      label: "Also return it parsed as JSON",
      type: "boolean",
      default: false,
      hint: "Lossy — the comments do not survive. Useful for reading a specific rule, wrong for " +
        "round-tripping the file.",
    },
  ],
  output: [
    { key: "hujson", type: "string", label: "The policy file verbatim, comments intact" },
    { key: "parsed", type: "object", label: "The same file as JSON — comments dropped" },
    { key: "warnings", type: "array", label: "Valid rules that mean nothing" },
    { key: "errors", type: "array", label: "Parse failures" },
    { key: "tagOwners", type: "array", label: "Tags declared in the file" },
    { key: "groups", type: "array", label: "Groups declared in the file" },
    { key: "ruleCount", type: "number", label: "How many ACL rules" },
    { key: "testCount", type: "number", label: "How many ACL tests guard them" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const tailnet = tailnetFrom(ctx.connection);
    const client = new TailscaleClient(ctx);

    // HuJSON verbatim: the comments are the reasoning.
    const hujson = await client.request<string>(
      `/tailnet/${encodeURIComponent(tailnet)}/acl`,
      { accept: "application/hujson", text: true },
    );

    // `details=true` is the only way to see warnings, and it forbids Accept.
    const details = await client.request<{
      acl?: string;
      warnings?: string[];
      errors?: string[];
    }>(`/tailnet/${encodeURIComponent(tailnet)}/acl`, { query: query({ details: true }) });

    const warnings = details?.warnings ?? [];
    if (warnings.length) {
      ctx.log(
        "warn",
        "the policy file parses and contains rules Tailscale considers nonsensical — a group " +
          "naming a user who does not exist, say, where the access goes to nobody",
        { warnings: warnings.length },
      );
    }

    let parsed: unknown;
    if (p.includeParsed === true) {
      parsed = await client.request(`/tailnet/${encodeURIComponent(tailnet)}/acl`, {
        accept: "application/json",
      });
    }

    const policy = parsed as {
      acls?: unknown[];
      tests?: unknown[];
      tagOwners?: Record<string, unknown>;
      groups?: Record<string, unknown>;
    } | undefined;

    // Without the parsed form these come from the text, which is enough for a
    // count of declarations.
    const declared = (key: string): string[] => {
      if (policy) {
        const value = (policy as Record<string, Record<string, unknown> | undefined>)[key];
        return value ? Object.keys(value) : [];
      }
      const match = new RegExp(`"${key}"\\s*:\\s*\\{([\\s\\S]*?)\\n\\s*\\}`).exec(hujson ?? "");
      if (!match) return [];
      return [...match[1].matchAll(/"([^"]+)"\s*:/g)].map((m) => m[1]);
    };

    return {
      hujson,
      parsed,
      warnings,
      errors: details?.errors ?? [],
      tagOwners: declared("tagOwners"),
      groups: declared("groups"),
      ruleCount: policy?.acls?.length ?? (hujson ?? "").split(/"action"\s*:/).length - 1,
      testCount: policy?.tests?.length ?? (hujson ?? "").split(/"src"\s*:/).length - 1,
    };
  },
};

export default action;
