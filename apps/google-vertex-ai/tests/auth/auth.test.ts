import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import oauth2 from "../../auth/oauth2.ts";

const cred = { accessToken: "at", projectId: "p1", location: "europe-west4" };
const PROBE =
  "https://europe-west4-aiplatform.googleapis.com/v1/projects/p1/locations/europe-west4/endpoints?pageSize=1";

Deno.test("oauth2: Google identity endpoints, offline access, cloud-platform scope", () => {
  assertEquals(oauth2.oauth2!.authorizationUrl, "https://accounts.google.com/o/oauth2/v2/auth");
  assertEquals(oauth2.oauth2!.tokenUrl, "https://oauth2.googleapis.com/token");
  assertEquals(oauth2.oauth2!.extraAuthParams?.access_type, "offline");
  assertEquals(oauth2.oauth2!.extraAuthParams?.prompt, "consent");
  assertEquals(oauth2.oauth2!.scopes, ["https://www.googleapis.com/auth/cloud-platform"]);
});

Deno.test("oauth2: signs with the bearer", async () => {
  const request = {
    url: "https://aiplatform.googleapis.com/v1/x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await oauth2.sign!({ request, credential: { accessToken: "at" } }, mockCtx().ctx);
  assertEquals(out.headers["authorization"], "Bearer at");
});

Deno.test("oauth2: test lists one endpoint in the connection's region", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  assertEquals(await oauth2.test!({ credential: cred } as never, ctx), { ok: true });
  assertEquals(calls[0].url, PROBE);
  assertEquals(calls[0].headers["authorization"], "Bearer at");
});

Deno.test("oauth2: the verdict comes from error.status / reason in the body, not the HTTP status", async () => {
  const cases: Array<[number, unknown, string]> = [
    [401, { error: { status: "UNAUTHENTICATED" } }, "UNAUTHENTICATED"],
    [
      403,
      { error: { status: "PERMISSION_DENIED", details: [{ reason: "SERVICE_DISABLED" }] } },
      "not enabled",
    ],
    [403, {
      error: { status: "PERMISSION_DENIED", details: [{ reason: "IAM_PERMISSION_DENIED" }] },
    }, "roles/aiplatform.user"],
    // a 400 with a body that says UNAUTHENTICATED is still a rejected credential
    [400, { error: { status: "UNAUTHENTICATED" } }, "UNAUTHENTICATED"],
    [404, { error: { status: "NOT_FOUND" } }, "no such project"],
    [500, { error: { status: "INTERNAL" } }, "500 INTERNAL"],
  ];
  for (const [status, body, needle] of cases) {
    const { ctx } = mockCtx([{ status, body }]);
    const r = await oauth2.test!({ credential: cred } as never, ctx) as {
      ok: boolean;
      message: string;
    };
    assertEquals(r.ok, false);
    assert(r.message.includes(needle), `${status}: ${r.message}`);
  }
});

Deno.test("oauth2: test needs a token and a project, and never echoes the token", async () => {
  const { ctx } = mockCtx();
  const a = await oauth2.test!({ credential: { projectId: "p" } } as never, ctx) as {
    message: string;
  };
  assert(a.message.includes("accessToken"));
  const b = await oauth2.test!({ credential: { accessToken: "SECRET" } } as never, ctx) as {
    message: string;
  };
  assert(b.message.includes("projectId") && !b.message.includes("SECRET"));
});

Deno.test("oauth2: afterConnect records project and defaults the location", () => {
  assertEquals(
    oauth2.afterConnect!({ credential: { projectId: " p1 " } } as never, mockCtx().ctx),
    {
      projectId: "p1",
      location: "us-central1",
    },
  );
});
