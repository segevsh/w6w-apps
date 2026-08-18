import type { AuthDefinition } from "@w6w/types";
import { hostFor, normalizeRegion } from "../lib/client.ts";

/**
 * Mixpanel **service account** — a username and secret sent as HTTP Basic,
 * plus the project id every call needs and the residency region that decides
 * which of nine hosts to call.
 *
 * A service account can reach several projects, which is why `project_id` is a
 * parameter on every request rather than something the credential implies.
 *
 * ## The project token, and why it is here but optional
 *
 * Mixpanel splits its APIs across two credentials and does not let you pick:
 *
 *   - **Query, raw export and event import** authenticate with the service
 *     account. Measured 2026-08-18, `POST /import` with a bogus service account
 *     answers `{"code":401,"error":"Not a valid service account username"}` —
 *     it validates properly.
 *   - **Profile writes (`/engage`) do not.** Measured the same day, `/engage`
 *     with a valid-shaped Basic credential *and* `project_id` still answers
 *     `{"error":"$token, missing or empty","status":0}`. The project token has
 *     to be **inside the payload**, and no header will do.
 *
 * An Action may never touch a credential, so the token cannot be put in the
 * body by the action that builds it. The `sign` hook can: it is the one place
 * allowed to hold a credential, it receives the request **body** as well as its
 * headers, and it runs network-less so it cannot leak what it holds. So `sign`
 * stamps `$token` into `/engage` payloads and nowhere else.
 *
 * The token is therefore **optional**: leave it out and every query, export and
 * import action works while the two profile actions fail with a message saying
 * exactly which field is missing.
 */
const serviceAccount: AuthDefinition = {
  key: "service-account",
  type: "basic",
  displayName: "Service Account",
  description:
    "A Mixpanel service account (username and secret), the project id, and the project's data " +
    "residency region. Add the project token only if you need to write user profiles.",
  connectionLabel: "project {{projectId}} ({{region}})",
  fields: [
    {
      key: "serviceAccountUsername",
      label: "Service Account Username",
      type: "string",
      required: true,
      placeholder: "my-service-account.a1b2c3.mp-service-account",
      hint: "Mixpanel → Organization Settings → Service Accounts.",
    },
    {
      key: "serviceAccountSecret",
      label: "Service Account Secret",
      type: "secret",
      required: true,
      hint: "Shown once, when the service account is created.",
    },
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      placeholder: "2195193",
      hint: "Project Settings → Overview. A service account can reach several projects, so " +
        "every call names one.",
    },
    {
      key: "region",
      label: "Data Residency",
      type: "select",
      default: "us",
      options: [
        { value: "us", label: "US — mixpanel.com" },
        { value: "eu", label: "EU — eu.mixpanel.com" },
        { value: "in", label: "India — in.mixpanel.com" },
      ],
      hint: "Where the project's data lives. The wrong region does not redirect — it simply " +
        "cannot find the project.",
    },
    {
      key: "projectToken",
      label: "Project Token",
      type: "secret",
      hint: "Only needed to WRITE user profiles: Mixpanel's /engage endpoint takes the token " +
        "inside the payload and accepts no header. Queries, exports and event imports do not " +
        "need it.",
    },
  ],

  /**
   * Basic auth for everything — plus, for `/engage` only, the project token
   * stamped into the payload.
   */
  sign({ request, credential }) {
    const { serviceAccountUsername, serviceAccountSecret, projectToken } = credential as {
      serviceAccountUsername: string;
      serviceAccountSecret: string;
      projectToken?: string;
    };
    request.headers["authorization"] = `Basic ${
      btoa(`${serviceAccountUsername}:${serviceAccountSecret}`)
    }`;

    // `/engage` is the one route that takes its credential in the body. Only
    // this hook may hold the token, so only this hook can put it there.
    if (projectToken && request.body && /\/engage(\?|$)/.test(request.url)) {
      try {
        const parsed = JSON.parse(request.body) as Array<Record<string, unknown>>;
        if (Array.isArray(parsed)) {
          request.body = JSON.stringify(
            parsed.map((record) => ({ $token: projectToken, ...record })),
          );
        }
      } catch {
        // A body that is not the JSON array /engage expects is left alone —
        // Mixpanel will reject it, and mangling it here would hide why.
      }
    }
    return request;
  },

  /**
   * `GET /api/app/me` is the service account's own identity route, and the
   * right probe for two reasons: it names the failure precisely (measured
   * 2026-08-18 it answers `{"status":"error","error":"Invalid service account
   * credentials"}`), and it is **not a query** — so testing a connection does
   * not spend one of the project's 60 queries an hour.
   */
  async test({ credential }, ctx) {
    const { serviceAccountUsername, serviceAccountSecret, projectId, region } = credential as {
      serviceAccountUsername?: string;
      serviceAccountSecret?: string;
      projectId?: string;
      region?: string;
    };
    if (!serviceAccountUsername || !serviceAccountSecret) {
      return { ok: false, message: "credential missing the service account username or secret" };
    }
    if (!projectId) return { ok: false, message: "credential missing projectId" };

    const host = hostFor("query", region);
    const res = await ctx.fetch(`${host}/api/app/me`, {
      headers: {
        authorization: `Basic ${btoa(`${serviceAccountUsername}:${serviceAccountSecret}`)}`,
        accept: "application/json",
      },
    });
    const text = await res.text().catch(() => "");
    if (!res.ok || /"status":\s*"error"/.test(text)) {
      if (/Invalid service account credentials/i.test(text)) {
        return {
          ok: false,
          message: `Mixpanel rejected the service account in the ${
            normalizeRegion(region).toUpperCase()
          } region — check the username, the secret, and the residency region`,
        };
      }
      return { ok: false, message: `Mixpanel returned ${res.status}: ${text.slice(0, 160)}` };
    }

    // `/api/app/me` lists the projects this account can reach; saying whether
    // the configured one is among them turns a vague failure into a specific
    // one.
    const body = JSON.parse(text || "{}") as { results?: { projects?: Record<string, unknown> } };
    const projects = body?.results?.projects;
    if (projects && typeof projects === "object" && !(String(projectId) in projects)) {
      return {
        ok: false,
        message:
          `the service account authenticated, but project ${projectId} is not one it can reach ` +
          `(it has access to: ${Object.keys(projects).slice(0, 5).join(", ") || "none"})`,
      };
    }
    return { ok: true, message: `connected to project ${projectId}` };
  },

  /**
   * Records what is safe to show: the project, the region, and *whether* a
   * project token was supplied — so a profile action can say "this connection
   * has no token" instead of failing at Mixpanel. Never the token itself.
   */
  afterConnect({ credential }) {
    const { projectId, region, projectToken, serviceAccountUsername } = credential as {
      projectId?: string;
      region?: string;
      projectToken?: string;
      serviceAccountUsername?: string;
    };
    return {
      projectId,
      region: normalizeRegion(region),
      hasProjectToken: Boolean(projectToken),
      serviceAccount: serviceAccountUsername,
    };
  },
};

export default serviceAccount;
