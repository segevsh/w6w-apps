import type { ActionDefinition } from "@w6w/types";
import { bucketName, query, StorageClient } from "../lib/client.ts";
import { BUCKET_PARAM } from "../lib/params.ts";

/**
 * `GET /b/{bucket}/iam` — who can reach this bucket.
 *
 * ## The two members that mean "the public"
 *
 * `allUsers` is everybody on the internet, unauthenticated. `allAuthenticatedUsers`
 * is anybody with *any* Google account — which sounds narrower and is not: it
 * is billions of people, and it is the one that gets granted by mistake because
 * "authenticated" reads as "our users".
 *
 * Either one on a read role makes the bucket's contents public. This action
 * flags both explicitly, because in a policy listing of a dozen bindings
 * neither stands out.
 *
 * ## This is not the whole picture
 *
 * A bucket's policy is one layer. Roles granted at the **project** level apply
 * here too and do not appear in this response, so a bucket with an empty
 * policy can still be readable by everyone with a project role. Answering "who
 * can read this" completely means looking at both, and this API only offers
 * one of them.
 *
 * ## Conditions make a binding conditional, and this says when
 *
 * A binding with a `condition` applies only when the expression holds — a
 * prefix, a time window, a tag. Reading the members without the condition
 * overstates the access, sometimes by a lot.
 */
const action: ActionDefinition = {
  key: "bucket-iam-get",
  type: "read",
  resource: "bucket",
  title: "Get a bucket's IAM policy",
  description:
    "Who can reach this bucket. Flags `allUsers` AND `allAuthenticatedUsers` — the second sounds " +
    "narrower and means anybody with a Google account. Project-level roles apply too and are " +
    "NOT in this response.",
  params: [
    BUCKET_PARAM,
    {
      key: "requestedPolicyVersion",
      label: "Policy Version",
      type: "number",
      default: 3,
      advanced: true,
      hint: "Version 3 is needed to see CONDITIONAL bindings — asking for 1 silently omits them.",
    },
  ],
  output: [
    { key: "policy", type: "object", label: "The raw policy" },
    { key: "bindings", type: "array", label: "Role and members, flattened" },
    { key: "roles", type: "array", label: "The distinct roles granted" },
    { key: "memberCount", type: "number", label: "Distinct members across all bindings" },
    { key: "publicToInternet", type: "boolean", label: "Whether allUsers appears" },
    {
      key: "publicToAnyGoogleAccount",
      type: "boolean",
      label: "Whether allAuthenticatedUsers does",
    },
    { key: "conditionalCount", type: "number", label: "Bindings that apply only sometimes" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const bucket = bucketName(p.bucket);

    const policy = await new StorageClient(ctx).request<{
      bindings?: Array<{ role?: string; members?: string[]; condition?: unknown }>;
    }>(`/b/${encodeURIComponent(bucket)}/iam`, {
      // Version 1 omits conditional bindings rather than reporting them.
      query: query({ optionsRequestedPolicyVersion: Number(p.requestedPolicyVersion ?? 3) }),
    });

    const bindings = policy?.bindings ?? [];
    const members = new Set<string>();
    for (const binding of bindings) {
      for (const member of binding?.members ?? []) members.add(member);
    }

    const publicToInternet = members.has("allUsers");
    const publicToAnyGoogleAccount = members.has("allAuthenticatedUsers");
    if (publicToInternet || publicToAnyGoogleAccount) {
      ctx.log(
        "warn",
        publicToInternet
          ? "this bucket's IAM policy grants allUsers — its contents are public to the internet"
          : "this bucket's IAM policy grants allAuthenticatedUsers — anybody with a Google " +
            "account, which is not the same as anybody in your organisation",
        { bucket },
      );
    }

    return {
      policy,
      bindings: bindings.map((binding) => ({
        role: binding?.role,
        members: binding?.members ?? [],
        conditional: Boolean(binding?.condition),
      })),
      roles: [...new Set(bindings.map((binding) => binding?.role).filter(Boolean))].sort(),
      memberCount: members.size,
      publicToInternet,
      publicToAnyGoogleAccount,
      conditionalCount: bindings.filter((binding) => Boolean(binding?.condition)).length,
    };
  },
};

export default action;
