import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/ip-access-list-set.ts";

const ORG = "11111111-2222-3333-4444-555555555555";
const SVC = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const D = { display: { organizationId: ORG, plane: "control" } };

const existing = (sources: string[]) => ({
  status: 200,
  body: { result: { ipAccessList: sources.map((source) => ({ source, description: "x" })) } },
});
const updated = { status: 200, body: { result: { ipAccessList: [] } } };

Deno.test("ip-access-list-set: reads the current list, then PATCHes the service", async () => {
  const { ctx, calls } = mockCtx([existing(["203.0.113.4"]), updated], D);
  const result = await action.execute({
    serviceId: SVC,
    ipAccessList: '[{"source":"203.0.113.4"},{"source":"198.51.100.7"}]',
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[1].method, "PATCH");
  assertEquals(result.added, ["198.51.100.7"]);
  assertEquals(result.removed, []);
});

/** The list replaces, so what stops working is worth naming first. */
Deno.test("ip-access-list-set: dropping a source needs an acknowledgement, and names it", async () => {
  const { ctx, calls } = mockCtx([existing(["203.0.113.4", "198.51.100.7"])], D);
  let message = "";
  try {
    await action.execute(
      { serviceId: SVC, ipAccessList: '[{"source":"203.0.113.4"}]' },
      ctx,
    );
  } catch (err) {
    message = String(err);
  }
  assert(/drops 1 source/.test(message), message);
  assert(/198\.51\.100\.7/.test(message), message);
  assert(/presents as a timeout rather than as a permission error/.test(message), message);
  assertEquals(calls.length, 1, "nothing was changed");
});

Deno.test("ip-access-list-set: an acknowledged removal goes through and warns", async () => {
  const { ctx, logs } = mockCtx([existing(["203.0.113.4", "198.51.100.7"]), updated], D);
  const result = await action.execute({
    serviceId: SVC,
    ipAccessList: '[{"source":"203.0.113.4"}]',
    confirmRemovals: true,
  }, ctx) as Record<string, unknown>;
  assertEquals(result.removed, ["198.51.100.7"]);
  assertEquals(logs[0].level, "warn");
  assert(/can no longer connect/.test(logs[0].message), logs[0].message);
});

Deno.test("ip-access-list-set: opening it to the internet needs its own acknowledgement", async () => {
  const { ctx, calls } = mockCtx([], D);
  let message = "";
  try {
    await action.execute(
      { serviceId: SVC, ipAccessList: '[{"source":"0.0.0.0/0"}]' },
      ctx,
    );
  } catch (err) {
    message = String(err);
  }
  assert(/set `confirmOpenToInternet`/.test(message), message);
  assertEquals(calls.length, 0, "checked before even reading the current list");
});

Deno.test("ip-access-list-set: the list must be an array", async () => {
  const { ctx, calls } = mockCtx([], D);
  let message = "";
  try {
    await action.execute({ serviceId: SVC, ipAccessList: '{"source":"x"}' }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/must be an array/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("ip-access-list-set: says it replaces rather than merges", () => {
  assert(/REPLACES rather than merges/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});
