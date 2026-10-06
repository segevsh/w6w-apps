import { assert, assertEquals } from "@std/assert";
import backgroundJobGet from "../../actions/background-job-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("background-job-get: calls GET /modern/background_job_status/job1 with the version header", async () => {
  const { ctx, calls } = mockCtx([{ body: { "ok": true, "hashed_id": "h1" } }]);
  const out = await backgroundJobGet.execute({ "jobId": "job1" } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).origin, "https://api.wistia.com");
  assertEquals(pathOf(calls[0].url), "/modern/background_job_status/job1");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["x-wistia-api-version"], "2026-09");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].body, null);
  assert(out.ok === true);
});

Deno.test("background-job-get: surfaces a Wistia error with its code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized_scope", error: "Token lacks scope." },
  }]);
  let message = "";
  try {
    await backgroundJobGet.execute({ "jobId": "job1" } as never, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Wistia 401 unauthorized_scope"), message);
  assert(message.includes("Token lacks scope."), message);
});
