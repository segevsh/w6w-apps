import { assert, assertEquals } from "@std/assert";
import service, { mapComponentStatus, PAGE_ID, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

type Check = NonNullable<typeof service.check>;
const run = (m: ReturnType<typeof mockCtx>) => (service.check as Check)({} as never, m.ctx);

function summary(api: string, other = "operational", pageId = PAGE_ID) {
  return {
    page: { id: pageId, name: "Woodpecker.co", url: "https://status.woodpecker.co" },
    components: [
      { id: "8kp73yylzxhn", name: "Woodpecker Web App", status: other },
      { id: "q9nwdd1b0y34", name: "Woodpecker API", status: api },
      { id: "73b6xdpgnkpq", name: "Woodpecker Lead Finder", status: "operational" },
    ],
  };
}

Deno.test("service: reads the Statuspage summary and is unsigned", async () => {
  const m = mockCtx([{ body: summary("operational") }]);
  const r = await run(m);
  assertEquals(r.state, "ok");
  assertEquals(m.calls[0].url, STATUS_URL);
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.woodpecker.co"]);
});

Deno.test("service: the API component decides, other components are detail", async () => {
  const web = await run(mockCtx([{ body: summary("operational", "major_outage") }]));
  assertEquals(web.state, "ok");
  assert((web.message ?? "").includes("Woodpecker Web App"));
  const api = await run(mockCtx([{ body: summary("major_outage") }]));
  assertEquals(api.state, "down");
  const partial = await run(mockCtx([{ body: summary("partial_outage") }]));
  assertEquals(partial.state, "degraded");
});

Deno.test("service: a page that is not Woodpecker's is unknown", async () => {
  const r = await run(mockCtx([{ body: summary("operational", "operational", "other") }]));
  assertEquals(r.state, "unknown");
});

Deno.test("service: a missing API component, bad status and bad body are unknown", async () => {
  const noApi = summary("operational");
  noApi.components = noApi.components.filter((c) => c.id !== "q9nwdd1b0y34");
  assertEquals((await run(mockCtx([{ body: noApi }]))).state, "unknown");
  assertEquals((await run(mockCtx([{ status: 503, body: {} }]))).state, "unknown");
  assertEquals((await run(mockCtx([{ body: "<html>" }]))).state, "unknown");
  const empty = { page: { id: PAGE_ID }, components: [] };
  assertEquals((await run(mockCtx([{ body: empty }]))).state, "unknown");
});

Deno.test("service: mapComponentStatus covers the documented vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("weird"), "unknown");
});
