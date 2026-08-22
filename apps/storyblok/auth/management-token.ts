import type { AuthDefinition } from "@w6w/types";
import { describeError, MANAGEMENT_HOSTS } from "../lib/client.ts";

/**
 * A personal access token for the Management API, sent in the `Authorization`
 * header **without a scheme**.
 *
 * ## `Authorization: <token>`, not `Bearer <token>`
 *
 * Storyblok's own examples send the token raw. Adding `Bearer` produces a 401
 * identical to a wrong token, which is a long afternoon for anybody who
 * assumes the usual convention.
 *
 * ## It is a person's token, and by default it reaches every space they own
 *
 * "All spaces" is the default when a token is created. It also carries a
 * permission per resource type — stories, assets, components, collaborators
 * and a dozen more — which can be narrowed, and a space list which can be
 * narrowed too.
 *
 * Both are worth narrowing before a workflow uses one. A token that can write
 * every story in every space the owner has is a large thing to put in an
 * automation, and unlike a delivery token it is not designed to be public: it
 * can delete content.
 *
 * ## The rate limit is 3 to 6 requests per second
 *
 * By plan, and it is the lowest limit in this pack by a wide margin. A
 * migration that loops over a thousand stories has to pace itself; there is no
 * bulk endpoint to avoid the problem.
 */
const auth: AuthDefinition = {
  key: "management-token",
  type: "apiKey",
  displayName: "Personal access token",
  apiKey: { in: "header", name: "Authorization" },
  connectionLabel: "{{spaceName}}",
  description:
    "A personal access token for the read-write Management API, sent as `Authorization: <token>` " +
    "with NO `Bearer` prefix — adding one is a 401 identical to a wrong token. Note the " +
    "Management API allows only 3 to 6 requests per second.",
  fields: [
    {
      key: "token",
      label: "Personal access token",
      type: "secret",
      required: true,
      hint: "My account → Account settings → Personal access tokens. It defaults to ALL SPACES " +
        "you own; narrow it to the space and the permissions a workflow needs.",
    },
    {
      key: "spaceId",
      label: "Space ID",
      type: "string",
      required: true,
      hint: "The numeric space id, from the space's settings. Management endpoints are all " +
        "space-scoped.",
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      default: "eu",
      required: true,
      options: [
        { value: "eu", label: "European Union — mapi.storyblok.com" },
        { value: "us", label: "United States — api-us.storyblok.com" },
        { value: "ca", label: "Canada — api-ca.storyblok.com" },
        { value: "ap", label: "Australia — api-ap.storyblok.com" },
        { value: "cn", label: "China — app.storyblokchina.cn" },
      ],
      hint: "Outside the EU the Management API shares a host with the delivery API and is told " +
        "apart by the path.",
    },
  ],

  sign({ request, credential }) {
    const token = String((credential as Record<string, unknown>)?.token ?? "");
    return {
      ...request,
      // Raw, with no scheme. `Bearer` here is a 401.
      headers: { ...request.headers, authorization: token },
    };
  },

  async test({ credential }, ctx) {
    const fields = credential as Record<string, unknown>;
    const region = String(fields?.region ?? "eu");
    const host = MANAGEMENT_HOSTS[region] ?? MANAGEMENT_HOSTS.eu;
    const spaceId = String(fields?.spaceId ?? "").trim();
    if (!spaceId) return { ok: false, message: "`spaceId` is required" };

    let res: Response;
    try {
      res = await ctx.fetch(`${host}/v1/spaces/${encodeURIComponent(spaceId)}`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${host}: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, message: describeError(res.status, text, "management") };

    interface SpaceResponse {
      space?: { id?: number; name?: string; plan?: string; story_published_hook?: string };
    }
    let space: SpaceResponse["space"];
    try {
      space = (JSON.parse(text) as SpaceResponse)?.space;
    } catch { /* an unexpected shape is still an authenticated call */ }

    return {
      ok: true,
      message: `reached ${space?.name ?? "the space"} (id ${space?.id ?? spaceId}) in the ` +
        `${region} region. This token can WRITE and DELETE content; the Management API allows ` +
        "only 3 to 6 requests a second, so anything looping over stories must pace itself",
    };
  },

  async afterConnect({ credential }, ctx) {
    const fields = credential as Record<string, unknown>;
    const region = String(fields?.region ?? "eu");
    const host = MANAGEMENT_HOSTS[region] ?? MANAGEMENT_HOSTS.eu;
    const spaceId = String(fields?.spaceId ?? "").trim();

    let spaceName = "";
    let plan = "";
    try {
      const res = await ctx.fetch(`${host}/v1/spaces/${encodeURIComponent(spaceId)}`, {
        headers: { accept: "application/json" },
      });
      if (res.ok) {
        const body = await res.json() as { space?: { name?: string; plan?: string } };
        spaceName = String(body?.space?.name ?? "");
        plan = String(body?.space?.plan ?? "");
      }
    } catch { /* the label is a convenience */ }

    return {
      credentialKind: "management",
      region,
      spaceId,
      spaceName,
      plan,
    };
  },
};

export default auth;
