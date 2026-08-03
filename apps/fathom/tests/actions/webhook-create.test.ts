import { assertEquals } from "@std/assert";
import { mockCtx, outputKeys } from "../_helpers.ts";
import action from "../../actions/webhook-create.ts";
import { TRIGGERED_FOR } from "../../lib/params.ts";

Deno.test("webhook-create: POSTs /webhooks with the documented snake_case body", async () => {
  const created = {
    id: "ikEoQ4bVoq4JYUmc",
    url: "https://example.com/webhook",
    secret: "whsec_x6EV6NIAAz3ldclszNJTwrow",
    created_at: "2025-06-30T10:40:46Z",
    triggered_for: ["my_recordings"],
  };
  const { ctx, calls, logs } = mockCtx([{ status: 201, body: created }]);
  const result = await action.execute({
    destinationUrl: "https://example.com/webhook",
    triggeredFor: ["my_recordings", "shared_team_recordings"],
    includeSummary: true,
    includeTranscript: true,
    includeActionItems: false,
    includeCrmMatches: false,
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/external/v1/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    destination_url: "https://example.com/webhook",
    triggered_for: ["my_recordings", "shared_team_recordings"],
    include_summary: true,
    include_transcript: true,
    include_action_items: false,
    include_crm_matches: false,
  });
  assertEquals(result, created);
  assertEquals(logs[0].level, "info");
});

Deno.test("webhook-create: defaults includeSummary on so the API's one-of rule is met", () => {
  assertEquals(action.params?.find((p) => p.key === "includeSummary")?.default, true);
  for (const key of ["includeTranscript", "includeActionItems", "includeCrmMatches"]) {
    assertEquals(action.params?.find((p) => p.key === key)?.default, false, key);
  }
});

Deno.test("webhook-create: offers exactly the four documented trigger types", () => {
  const options = action.params?.find((p) => p.key === "triggeredFor")
    ?.options as Array<{ value: string }>;
  assertEquals(options.map((o) => o.value).sort(), [...TRIGGERED_FOR].sort());
  assertEquals(action.params?.find((p) => p.key === "triggeredFor")?.required, true);
});

Deno.test("webhook-create: is a non-idempotent perform and returns the signing secret", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assertEquals(outputKeys(action).includes("secret"), true);
});
