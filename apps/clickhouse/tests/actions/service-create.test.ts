import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/service-create.ts";

const ORG = "11111111-2222-3333-4444-555555555555";
const D = { display: { organizationId: ORG, plane: "control" } };

const created = {
  status: 200,
  body: {
    result: {
      service: {
        id: "svc-1",
        state: "provisioning",
        endpoints: [{ protocol: "https", host: "abc.clickhouse.cloud", port: 8443 }],
      },
      password: "generated-once",
    },
  },
};

const base = {
  name: "analytics",
  provider: "aws",
  region: "eu-west-1",
  ipAccessList: '[{"source":"203.0.113.4","description":"workflow"}]',
};

Deno.test("service-create: posts to the organisation's services", async () => {
  const { ctx, calls } = mockCtx([created], D);
  const result = await action.execute(base, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, `https://api.clickhouse.cloud/v1/organizations/${ORG}/services`);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!).region, "eu-west-1");
  assertEquals(result.id, "svc-1");
  assertEquals(result.state, "provisioning");
  assertEquals(result.host, "abc.clickhouse.cloud");
});

/** Returned once by the API and never retrievable again. */
Deno.test("service-create: returns the generated password and never logs it", async () => {
  const { ctx, logs } = mockCtx([created], D);
  const result = await action.execute(base, ctx) as Record<string, unknown>;
  assertEquals(result.password, "generated-once");
  assertEquals(JSON.stringify(logs).includes("generated-once"), false);
  assert(/returned ONCE/.test(action.description!), action.description);
});

/** Both defaults are wrong, so it is required. */
Deno.test("service-create: the IP access list is required and must be an array", async () => {
  for (const list of [undefined, "", '{"source":"x"}']) {
    const { ctx, calls } = mockCtx([], D);
    let message = "";
    try {
      await action.execute({ ...base, ipAccessList: list }, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(/must be an array/.test(message), `${list}: ${message}`);
    assert(/an empty list accepts no connections at all/.test(message), message);
    assertEquals(calls.length, 0);
  }
});

Deno.test("service-create: an open list needs an acknowledgement", async () => {
  const { ctx, calls } = mockCtx([], D);
  let message = "";
  try {
    await action.execute(
      { ...base, ipAccessList: '[{"source":"0.0.0.0/0","description":"any"}]' },
      ctx,
    );
  } catch (err) {
    message = String(err);
  }
  assert(/set `confirmOpenToInternet`/.test(message), message);
  assert(/still password-protected/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("service-create: an acknowledged open list goes through and warns", async () => {
  const { ctx, logs } = mockCtx([created], D);
  const result = await action.execute({
    ...base,
    ipAccessList: '[{"source":"0.0.0.0/0","description":"any"}]',
    confirmOpenToInternet: true,
  }, ctx) as Record<string, unknown>;
  assertEquals(result.openToInternet, true);
  assertEquals(logs[0].level, "warn");
});

/** The bill follows use rather than time. */
Deno.test("service-create: idle scaling is on by default and sent explicitly", async () => {
  const { ctx, calls } = mockCtx([created], D);
  await action.execute(base, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.idleScaling, true);
  assertEquals(body.idleTimeoutMinutes, 15);
  assertEquals(action.params!.find((p) => p.key === "idleScaling")!.default, true);

  const off = mockCtx([created], D);
  await action.execute({ ...base, idleScaling: false }, off.ctx);
  const offBody = JSON.parse(off.calls[0].body!);
  assertEquals(offBody.idleScaling, false);
  assertEquals("idleTimeoutMinutes" in offBody, false);
});

Deno.test("service-create: a region is required and cannot be changed later", async () => {
  const { ctx, calls } = mockCtx([], D);
  let message = "";
  try {
    await action.execute({ ...base, region: "" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/cannot be moved later/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("service-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
