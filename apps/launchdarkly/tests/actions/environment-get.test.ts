import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/environment-get.ts";

const conn = { display: { projectKey: "default", environmentKey: "production" } };

Deno.test("environment-get: reads one environment", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { key: "production", apiKey: "sdk-x" } }],
    conn,
  );
  const result = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(
    calls[0].url,
    "https://app.launchdarkly.com/api/v2/projects/default/environments/production",
  );
  assertEquals(result.key, "production");
});

/** The response contains SDK keys — a workflow storing it is storing secrets. */
Deno.test("environment-get: the outputs flag the SDK keys as credentials", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "apiKey")!.label.includes("is a secret"));
  assert(outputs.find((o) => o.key === "mobileKey")!.label.includes("also a secret"));
  assert(action.description!.includes("SDK keys"), action.description);
});

/** Only the identifiers are logged, never the response. */
Deno.test("environment-get: logs only the project and environment", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { apiKey: "sdk-secret" } }], conn);
  await action.execute!({}, ctx);
  assert(!JSON.stringify(logs).includes("sdk-secret"), "an SDK key reached a log line");
});
