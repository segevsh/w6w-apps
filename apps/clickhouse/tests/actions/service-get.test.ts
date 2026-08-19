import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/service-get.ts";

const ORG = "11111111-2222-3333-4444-555555555555";
const SVC = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const D = { display: { organizationId: ORG, plane: "control" } };

const service = (attributes: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    result: {
      name: "prod",
      state: "running",
      clickhouseVersion: "26.8.1",
      idleScaling: true,
      numReplicas: 3,
      ipAccessList: [{ source: "203.0.113.4", description: "office" }],
      endpoints: [
        { protocol: "https", host: "abc.eu-west-1.aws.clickhouse.cloud", port: 8443 },
        { protocol: "nativesecure", host: "abc.eu-west-1.aws.clickhouse.cloud", port: 9440 },
      ],
      ...attributes,
    },
  },
});

Deno.test("service-get: reads one service and surfaces the HTTPS endpoint", async () => {
  const { ctx, calls } = mockCtx([service()], D);
  const result = await action.execute({ serviceId: SVC }, ctx) as Record<string, unknown>;
  assertEquals(
    calls[0].url,
    `https://api.clickhouse.cloud/v1/organizations/${ORG}/services/${SVC}`,
  );
  assertEquals(result.host, "abc.eu-west-1.aws.clickhouse.cloud");
  assertEquals(result.port, 8443, "the HTTPS endpoint, not the native one");
  assertEquals(result.queryable, true);
});

/** `running` is the only state that answers SQL without waking first. */
Deno.test("service-get: only a running service is reported as queryable", async () => {
  for (
    const [state, queryable] of [
      ["running", true],
      ["idle", false],
      ["stopped", false],
      ["provisioning", false],
    ] as Array<[string, boolean]>
  ) {
    const { ctx } = mockCtx([service({ state })], D);
    const result = await action.execute({ serviceId: SVC }, ctx) as Record<string, unknown>;
    assertEquals(result.queryable, queryable, state);
  }
});

/** An address off the list fails to connect, not to authenticate. */
Deno.test("service-get: surfaces the IP access list, and flags an open one", async () => {
  const { ctx, logs } = mockCtx([service({
    ipAccessList: [{ source: "0.0.0.0/0", description: "anywhere" }],
  })], D);
  const result = await action.execute({ serviceId: SVC }, ctx) as Record<string, unknown>;
  assertEquals(result.openToInternet, true);
  assertEquals(logs[0].level, "warn");
  assert(/reachable from anywhere/.test(logs[0].message), logs[0].message);
  assert(
    /fails to CONNECT rather than to authenticate/.test(action.description!),
    action.description,
  );
});

Deno.test("service-get: a restricted list does not warn", async () => {
  const { ctx, logs } = mockCtx([service()], D);
  const result = await action.execute({ serviceId: SVC }, ctx) as Record<string, unknown>;
  assertEquals(result.openToInternet, false);
  assertEquals(logs.length, 0);
});

/** A name used where a UUID belongs looks exactly like a missing service. */
Deno.test("service-get: a name instead of an id is refused before the request", async () => {
  const { ctx, calls } = mockCtx([], D);
  let message = "";
  try {
    await action.execute({ serviceId: "prod" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/must be a UUID/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("service-get: reports the scaling fields the bill depends on", async () => {
  const { ctx } = mockCtx([service({ idleScaling: false })], D);
  const result = await action.execute({ serviceId: SVC }, ctx) as Record<string, unknown>;
  assertEquals(result.idleScaling, false);
  assertEquals(result.numReplicas, 3);
});
