import { assert, assertEquals } from "@std/assert";
import auth, { signBody } from "../../auth/partner.ts";
import { buildBody } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";
import { ENDPOINT, sent } from "../_job.ts";

const CRED = { partnerUserID: "aa_user", partnerUserSecret: "s3cret" };
const req = (body: string) => ({
  url: ENDPOINT,
  method: "POST",
  headers: {} as Record<string, string>,
  body,
});

Deno.test("partner: declares a custom method with an id field and a secret field", () => {
  assertEquals(auth.key, "partner-credentials");
  assertEquals(auth.type, "custom");
  const byKey = Object.fromEntries(auth.fields!.map((f) => [f.key, f]));
  assertEquals(byKey.partnerUserSecret.type, "secret");
  assertEquals(byKey.partnerUserSecret.required, true);
  assertEquals(byKey.partnerUserID.required, true);
});

Deno.test("partner: sign puts the pair into the job description and keeps everything else", () => {
  const body = buildBody(
    {
      type: "file",
      inputSettings: { type: "combinedReportData" },
      outputSettings: { fileExtension: "csv" },
    },
    { template: "<#list reports as r>${r.reportName}</#list>" },
  );
  const out = auth.sign!({ request: req(body), credential: CRED }, mockCtx().ctx) as ReturnType<
    typeof req
  >;
  const { job, extra } = sent({
    url: out.url,
    method: out.method,
    headers: out.headers,
    body: out.body as string,
  });
  assertEquals(job.credentials, CRED);
  assertEquals(job.type, "file");
  assertEquals(job.inputSettings, { type: "combinedReportData" });
  assertEquals(job.outputSettings, { fileExtension: "csv" });
  assertEquals(extra, { template: "<#list reports as r>${r.reportName}</#list>" });
  assertEquals(out.headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out.url, ENDPOINT);
});

Deno.test("partner: sign OVERWRITES a job-supplied credentials block rather than merging it", () => {
  const body = buildBody({
    type: "get",
    credentials: { authToken: "evil", feedUrl: "https://evil.example", partnerUserID: "other" },
  } as never);
  const signed = signBody(body, CRED);
  const job = JSON.parse(new URLSearchParams(signed).get("requestJobDescription")!);
  assertEquals(job.credentials, CRED);
  assert(!signed.includes("evil"));
});

Deno.test("partner: sign trims the stored fields", () => {
  const out = auth.sign!(
    {
      request: req(buildBody({ type: "get" })),
      credential: { partnerUserID: " aa_user\n", partnerUserSecret: " s3cret " },
    },
    mockCtx().ctx,
  ) as ReturnType<typeof req>;
  const job = JSON.parse(new URLSearchParams(out.body as string).get("requestJobDescription")!);
  assertEquals(job.credentials, CRED);
});

Deno.test("partner: sign refuses a request with no job description rather than sending it unsigned", () => {
  let msg = "";
  try {
    auth.sign!({ request: req("a=b"), credential: CRED }, mockCtx().ctx);
  } catch (e) {
    msg = String(e);
  }
  assert(msg.includes("no requestJobDescription"));
  try {
    signBody("requestJobDescription=%7Bnope", CRED);
    assert(false, "should have thrown");
  } catch (e) {
    assert(String(e).includes("not valid JSON"));
  }
});

Deno.test("partner: test passes on a policyList array and signs the probe itself", async () => {
  const { ctx, calls } = mockCtx([{
    body: { responseCode: 200, policyList: [{ id: "P1", name: "Acme" }] },
  }]);
  assertEquals((await auth.test!({ credential: CRED }, ctx)).ok, true);
  const { job } = sent(calls[0]);
  assertEquals(job.credentials, CRED);
  assertEquals(job.type, "get");
  assertEquals(job.inputSettings, { type: "policyList" });
});

Deno.test("partner: test passes for an account with no policies (empty array)", async () => {
  const { ctx } = mockCtx([{ body: { responseCode: 200, policyList: [] } }]);
  assertEquals((await auth.test!({ credential: CRED }, ctx)).ok, true);
});

Deno.test("partner: a rejected pair is HTTP 200 with responseCode 404 — classified from the body", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { responseMessage: "Authentication error", responseCode: 404 },
  }]);
  const res = await auth.test!({ credential: CRED }, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("rejected the partner credentials"));
  assert(!res.message!.includes("s3cret"));
});

Deno.test("partner: test reports other vendor codes, rate limits, and non-envelope bodies distinctly", async () => {
  const forbidden = mockCtx([{
    body: { responseMessage: "No authentication method specified", responseCode: 403 },
  }]);
  assert(!(await auth.test!({ credential: CRED }, forbidden.ctx)).ok);

  const limited = mockCtx([{ body: { responseMessage: "Too many requests", responseCode: 429 } }]);
  assert((await auth.test!({ credential: CRED }, limited.ctx)).message!.includes("rate-limited"));

  const html = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  assert((await auth.test!({ credential: CRED }, html.ctx)).message!.includes("without its"));

  const odd = mockCtx([{ body: { responseCode: 200 } }]);
  assert(
    (await auth.test!({ credential: CRED }, odd.ctx)).message!.includes("without a policyList"),
  );

  const other = mockCtx([{ body: { responseMessage: "boom", responseCode: 500 } }]);
  assert((await auth.test!({ credential: CRED }, other.ctx)).message!.includes("500: boom"));
});

Deno.test("partner: test names a missing field and never calls the network", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await auth.test!({ credential: { partnerUserID: "x" } }, ctx)).ok, false);
  assertEquals(
    (await auth.test!({ credential: {} }, ctx)).message,
    "credential missing partnerUserID",
  );
  assertEquals(calls.length, 0);
});
