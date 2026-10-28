import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-space.ts";

Deno.test("create-space: POSTs to /v2/spaces with no body when no config is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "spaces/abc", meetingCode: "abc-mnop-xyz" } }]);
  const result = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(result.name, "spaces/abc");
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.host, "meet.googleapis.com");
  assertEquals(url.pathname, "/v2/spaces");
  assertEquals(calls[0].body, null);
});

Deno.test("create-space: nests flat config fields under `config`", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "spaces/abc" } }]);
  await action.execute!({
    accessType: "TRUSTED",
    entryPointAccess: "CREATOR_APP_ONLY",
    moderation: "ON",
    moderationRestrictions: { chatRestriction: "HOSTS_ONLY" },
    artifactConfig: { recordingConfig: { autoRecordingGeneration: "ON" } },
    attendanceReportGenerationType: "GENERATE_REPORT",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    config: {
      accessType: "TRUSTED",
      entryPointAccess: "CREATOR_APP_ONLY",
      moderation: "ON",
      moderationRestrictions: { chatRestriction: "HOSTS_ONLY" },
      artifactConfig: { recordingConfig: { autoRecordingGeneration: "ON" } },
      attendanceReportGenerationType: "GENERATE_REPORT",
    },
  });
});

Deno.test("create-space: a single config field still sends only that field", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "spaces/abc" } }]);
  await action.execute!({ moderation: "OFF" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { config: { moderation: "OFF" } });
});
