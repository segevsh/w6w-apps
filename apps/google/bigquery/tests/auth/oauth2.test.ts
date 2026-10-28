import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: uses Google's identity endpoints with offline access", () => {
  assertEquals(auth.oauth2!.authorizationUrl, "https://accounts.google.com/o/oauth2/v2/auth");
  assertEquals(auth.oauth2!.tokenUrl, "https://oauth2.googleapis.com/token");
  // Without both of these Google does not reliably return a refresh token.
  assertEquals(auth.oauth2!.extraAuthParams?.access_type, "offline");
  assertEquals(auth.oauth2!.extraAuthParams?.prompt, "consent");
});

/** One scope, not seven — cloud-platform would grant every Google Cloud API. */
Deno.test("oauth2: asks for the narrow bigquery scope only", () => {
  assertEquals(auth.oauth2!.scopes, ["https://www.googleapis.com/auth/bigquery"]);
  for (const s of auth.oauth2!.scopes!) {
    assert(!s.includes("cloud-platform"), `unexpectedly broad scope: ${s}`);
    assert(!s.includes("devstorage"), `unexpected storage scope: ${s}`);
  }
});

Deno.test("oauth2: signs with the bearer", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://bigquery.googleapis.com/bigquery/v2/projects/p1/queries",
    method: "POST" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "at" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer at");
});

/**
 * The probe proves the token AND that it can see the named project — the
 * failure most worth catching at connect time.
 */
Deno.test("oauth2: test lists the project's datasets", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { datasets: [] } }]);
  assertEquals(
    await auth.test!({ credential: { accessToken: "at", projectId: "p1" } } as never, ctx),
    { ok: true },
  );
  assertEquals(
    calls[0].url,
    "https://bigquery.googleapis.com/bigquery/v2/projects/p1/datasets?maxResults=1",
  );
});

Deno.test("oauth2: 401, 403 and 404 are three different fixes", async () => {
  const cases: Array<[number, string]> = [
    [401, "401"],
    [403, "not enabled"],
    [404, "no such project"],
  ];
  for (const [status, needle] of cases) {
    const { ctx } = mockCtx([{ status, body: {} }]);
    const r = await auth.test!(
      { credential: { accessToken: "at", projectId: "p1" } } as never,
      ctx,
    ) as { ok: boolean; message: string };
    assertEquals(r.ok, false);
    assert(r.message.includes(needle), `${status}: ${r.message}`);
  }
});

Deno.test("oauth2: a missing token or project fails before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test!({ credential: {} } as never, ctx), {
    ok: false,
    message: "credential missing accessToken",
  });
  assertEquals(await auth.test!({ credential: { accessToken: "at" } } as never, ctx), {
    ok: false,
    message: "credential missing projectId",
  });
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: afterConnect records the project and default dataset", async () => {
  assertEquals(
    await auth.afterConnect!(
      { credential: { projectId: " p1 ", datasetId: "d1" } } as never,
      null as never,
    ),
    { projectId: "p1", datasetId: "d1" },
  );
  assertEquals(
    await auth.afterConnect!({ credential: { projectId: "p1" } } as never, null as never),
    { projectId: "p1", datasetId: undefined },
  );
});
