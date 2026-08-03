import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import check, { componentId, COMPONENTS_URL, mapStatus } from "../../health/service.ts";

const region = (
  name: string,
  leaves: Array<{ status: string; ignore?: boolean }>,
) => ({
  id: 1,
  name,
  components: [{
    id: 2,
    name: `${name} Web App`,
    components: leaves.map((leaf, i) => ({
      id: 100 + i,
      name: `Component ${i}`,
      status: leaf.status,
      display_options: leaf.ignore ? { ignore_overall_status: "true" } : {},
    })),
  }],
});

Deno.test("service: is unsigned, app-scoped, and widens egress only to the status host", () => {
  assertEquals(check.kind, "service");
  // `credential` and `scope` are left at the kind's defaults — none / app.
  assertEquals(check.credential, undefined);
  assertEquals(check.scope, undefined);
  // The status host must NOT be on the app's own allowlist.
  assertEquals(check.network?.allow, ["public-api.freshstatus.io"]);
});

Deno.test("service: calls the Freshstatus account behind updates.freshservice.com", async () => {
  const { ctx, calls } = mockCtx([{
    body: { components: [region("US EAST", [{ status: "OP" }])] },
  }]);
  await check.check!({}, ctx);
  assertEquals(calls[0].url, COMPONENTS_URL);
  assertEquals(calls[0].url.includes("account_id=3616"), true);
});

Deno.test("service: reports ok with one component per region", async () => {
  const { ctx } = mockCtx([{
    body: {
      components: [
        region("US EAST (NORTH VIRGINIA)", [{ status: "OP" }, { status: "OP" }]),
        region("EU CENTRAL (FRANKFURT)", [{ status: "OP" }]),
      ],
    },
  }]);
  const out = await check.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(Object.keys(out.components ?? {}), [
    "us-east-north-virginia",
    "eu-central-frankfurt",
  ]);
  assertEquals(out.message, undefined);
});

Deno.test("service: honours ignore_overall_status, as Freshworks' own roll-up does", async () => {
  // This is not hypothetical: all 36 MEA components sit at MO behind this
  // flag, so counting them would pin every connection at `down` forever.
  const { ctx } = mockCtx([{
    body: {
      components: [
        region("MIDDLE EAST AND AFRICA (MEA)", [{ status: "MO", ignore: true }]),
        region("US EAST", [{ status: "OP" }]),
      ],
    },
  }]);
  const out = await check.check!({}, ctx);
  assertEquals(out.state, "ok");
  // A region with nothing countable contributes no component at all.
  assertEquals(Object.keys(out.components ?? {}), ["us-east"]);
});

Deno.test("service: a real outage is reported down, with the region named", async () => {
  const { ctx } = mockCtx([{
    body: {
      components: [
        region("US EAST", [{ status: "MO" }, { status: "OP" }]),
        region("INDIA (MUMBAI)", [{ status: "PD" }]),
      ],
    },
  }]);
  const out = await check.check!({}, ctx);
  assertEquals(out.state, "down");
  assertEquals(out.components?.["us-east"], {
    state: "down",
    message: "1/2 components affected",
  });
  assertEquals(out.components?.["india-mumbai"].state, "degraded");
  assertEquals(out.message, "affected regions: us-east, india-mumbai");
});

Deno.test("service: a broken status API is `unknown`, never `down`", async () => {
  const bad = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await check.check!({}, bad.ctx)).state, "unknown");

  const empty = mockCtx([{ body: { components: [] } }]);
  assertEquals((await check.check!({}, empty.ctx)).state, "unknown");

  const junk = mockCtx([{ body: "not json", headers: { "content-type": "text/plain" } }]);
  assertEquals((await check.check!({}, junk.ctx)).state, "unknown");
});

Deno.test("service: every region ignored means unknown, not a false ok", async () => {
  const { ctx } = mockCtx([{
    body: { components: [region("MEA", [{ status: "MO", ignore: true }])] },
  }]);
  const out = await check.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("mapStatus: Freshstatus' vocabulary, and unknown for anything new", () => {
  assertEquals(mapStatus("OP"), "ok");
  assertEquals(mapStatus("PD"), "degraded");
  assertEquals(mapStatus("PO"), "degraded");
  assertEquals(mapStatus("UM"), "degraded");
  assertEquals(mapStatus("MO"), "down");
  assertEquals(mapStatus("XX"), "unknown");
  assertEquals(mapStatus(undefined), "unknown");
});

Deno.test("componentId: slugifies a region name into a stable selector", () => {
  assertEquals(componentId("EU NORTH(STOCKHOLM)"), "eu-north-stockholm");
  assertEquals(componentId("MIDDLE EAST AND AFRICA (MEA)"), "middle-east-and-africa-mea");
});
