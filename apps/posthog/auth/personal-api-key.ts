import type { AuthDefinition } from "@w6w/types";
import { appHost, type PostHogRegion } from "../lib/client.ts";

/**
 * Personal API Key (`bearer`).
 *
 * This authenticates every action in this app EXCEPT `capture-event` — see
 * that action's file for why event capture uses a completely different,
 * intentionally-public key instead.
 *
 * PostHog → Settings → Personal API Keys. Sent as `Authorization: Bearer
 * <key>` against the app/query REST API (`us.posthog.com` / `eu.posthog.com`),
 * scoped by the key's own granted scopes — this app calls read endpoints for
 * persons/cohorts/feature-flags/insights and a write endpoint for
 * annotations, so a key needs at least those `*:read` scopes plus
 * `annotation:write` for `annotation-create` to succeed.
 *
 * `region` and `projectId` are collected here, once, rather than per action:
 * almost every endpoint in the app/query API is scoped to a project
 * (`/api/projects/{project_id}/...`), and a Personal API Key's account can
 * span many projects/regions, so both are needed to address the right one.
 * `afterConnect` echoes them onto the connection's `display` data — the same
 * pattern Mailgun's region and Zendesk's subdomain use in this pack — so
 * every action reads them from there via `lib/client.ts` and never touches
 * the credential itself.
 */
const personalApiKey: AuthDefinition = {
  key: "personal-api-key",
  type: "bearer",
  displayName: "Personal API Key",
  description:
    "PostHog → Settings → Personal API Keys. Grant the read scopes for the resources you plan to query, plus annotation:write to create annotations.",
  connectionLabel: "PostHog ({{region}})",
  fields: [
    {
      key: "personalApiKey",
      label: "Personal API Key",
      type: "secret",
      required: true,
      hint: "Settings → Personal API Keys → Create personal API key.",
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      default: "us",
      hint: "Which PostHog Cloud your project lives on. Self-hosted instances are not supported.",
      options: [
        { value: "us", label: "United States (us.posthog.com)" },
        { value: "eu", label: "Europe (eu.posthog.com)" },
      ],
    },
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "PostHog → Project Settings → General → Project ID (the numeric id, not the API key).",
    },
  ],

  sign({ request, credential }) {
    const { personalApiKey } = credential as { personalApiKey: string };
    request.headers["authorization"] = `Bearer ${personalApiKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { personalApiKey, region } = credential as { personalApiKey?: string; region?: string };
    if (!personalApiKey) return { ok: false, message: "credential missing personalApiKey" };
    // `/api/users/@me/` needs only the `user:read` scope (the narrowest a key
    // can carry) and no projectId, so it works before we even know the key
    // has access to the project the user typed in. Confirmed in PostHog's own
    // source (posthog/api/user.py): `@me` is a special-cased lookup value for
    // "the authenticated user", not a real UUID.
    const host = appHost(region === "eu" ? "eu" : "us");
    const res = await ctx.fetch(`https://${host}/api/users/@me/`, {
      headers: { authorization: `Bearer ${personalApiKey}` },
    });
    if (!res.ok) return { ok: false, message: `PostHog returned ${res.status}` };
    return { ok: true };
  },

  /** Records region + projectId on the connection so actions never see the credential. */
  afterConnect({ credential }) {
    const { region, projectId } = credential as { region?: string; projectId?: string };
    const normalized: PostHogRegion = region === "eu" ? "eu" : "us";
    return { region: normalized, projectId: String(projectId ?? "") };
  },
};

export default personalApiKey;
