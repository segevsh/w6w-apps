import { assert, assertEquals } from "@std/assert";
import api, { PROBE_URL } from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api: probes the platform host unsigned, with no egress widening", () => {
  assertEquals(PROBE_URL, "https://platform.ringcentral.com/restapi");
  assertEquals(api.credential, "none");
  assertEquals(api.network, undefined);
});

Deno.test("api: a 200 carrying apiVersions reports ok", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        uri: "https://platform.ringcentral.com/restapi",
        apiVersions: [{ uriString: "v1.0", versionString: "1.0.60" }],
        serverVersion: "26.3.1.10210249",
      },
    },
  ]);
  const report = await api.check!({}, ctx);
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(report.state, "ok");
  assert(report.message?.includes("26.3.1.10210249"), report.message);
});

Deno.test("api: a 200 with no apiVersions reports down, not ok", async () => {
  const { ctx } = mockCtx([{ body: { uri: "x" } }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("api: a non-JSON body reports down", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await api.check!({}, ctx)).state, "down");
});

Deno.test("api: a 5xx reports down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await api.check!({}, ctx)).state, "down");
});

Deno.test("api: an unexpected 4xx reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 418, body: "{}" }]);
  assertEquals((await api.check!({}, ctx)).state, "unknown");
});
