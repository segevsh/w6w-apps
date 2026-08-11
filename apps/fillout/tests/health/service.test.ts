import { assert, assertEquals } from "@std/assert";
import service, {
  API_COMPONENT_NAME,
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_PAGE_ID,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/**
 * The `page` block exactly as `fillout.statuspage.io/api/v2/summary.json`
 * served it on 2026-08-11 — note the name and URL, which say **Zite**.
 */
const PAGE = { id: STATUS_PAGE_ID, name: "Zite", url: "https://status.zite.com" };

/** The seven components the page carries, with the vendor's real ids. */
const COMPONENTS = [
  { id: "6xdb51s0vf2m", name: "Forms (respondent experience)", status: "operational" },
  { id: "d6qzt2jzpw23", name: "Form editor", status: "operational" },
  { id: "w399n1jhgyj3", name: "Workspaces, Settings & Admin", status: "operational" },
  { id: "541scx7wgbm2", name: API_COMPONENT_NAME, status: "operational" },
  { id: "hvql32lcjrc2", name: "Zite Database", status: "operational" },
  { id: "6srjfnhdz490", name: "Zite Apps", status: "operational" },
  { id: "ntkf0b1l7jld", name: "Zite App Editor", status: "operational" },
];

const summary = (over: Record<string, unknown> = {}) => ({
  page: PAGE,
  components: COMPONENTS,
  incidents: [],
  scheduled_maintenances: [],
  status: { indicator: "none", description: "All Systems Operational" },
  ...over,
});

const run = (body: unknown, status = 200) => {
  const mock = mockCtx([{ status, body }], { noConnection: true });
  return { mock, report: service.check!({}, mock.ctx) };
};

Deno.test("service: probes the statuspage.io alias, not a guessed status.<vendor> host", () => {
  assertEquals(STATUS_URL, "https://fillout.statuspage.io/api/v2/summary.json");
  // status.fillout.com answers 404 from an unrelated Next.js app (measured
  // 2026-08-11), so guessing the convention here is worse than useless.
  assert(!STATUS_URL.includes("status.fillout.com"));
  assertEquals(service.network?.allow, ["fillout.statuspage.io"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: an all-operational page is ok and reports all seven components", async () => {
  const { mock, report } = run(summary());
  const result = await report;
  assertEquals(mock.calls[0].url, STATUS_URL);
  assertEquals(result.state, "ok");
  assertEquals(Object.keys(result.components ?? {}).length, 7);
  // Keyed by the vendor's opaque id, with the human name in the message.
  assertEquals(result.components?.["541scx7wgbm2"], {
    state: "ok",
    message: API_COMPONENT_NAME,
  });
});

/**
 * **The finding this check exists to survive.** The page is branded Zite and
 * canonically lives at `status.zite.com`. A guard that required the page to
 * self-identify as *Fillout* — by name or by URL — would reject the correct
 * page and report `unknown` forever. Identity is pinned to the page id instead.
 */
Deno.test("service: a page calling itself Zite is accepted, because the id matches", async () => {
  const { report } = run(summary());
  const result = await report;
  assertEquals(result.state, "ok");
  assert(!/not Fillout/.test(result.message ?? ""), result.message);
});

Deno.test("service: a different page id is unknown, not a verdict about Fillout", async () => {
  const { report } = run(summary({ page: { ...PAGE, id: "someoneelsespage" } }));
  const result = await report;
  assertEquals(result.state, "unknown");
  assert(/someoneelsespage/.test(result.message ?? ""), result.message);
});

Deno.test("service: the vendor's own indicator is the verdict", async () => {
  for (
    const [indicator, expected] of [
      ["none", "ok"],
      ["minor", "degraded"],
      ["major", "degraded"],
      ["maintenance", "degraded"],
      ["critical", "down"],
      ["something-new", "unknown"],
    ] as const
  ) {
    const { report } = run(summary({ status: { indicator } }));
    assertEquals((await report).state, expected, indicator);
  }
});

/**
 * The one place the component list overrides the roll-up, and it is monotone:
 * `Developer API` can only make the verdict worse. This app talks to exactly
 * that component, so a page claiming "All Systems Operational" while the API is
 * in a major outage must not be reported as `ok`.
 */
Deno.test("service: a broken Developer API worsens an otherwise-clean roll-up", async () => {
  const components = COMPONENTS.map((c) =>
    c.name === API_COMPONENT_NAME ? { ...c, status: "major_outage" } : c
  );
  const { report } = run(summary({ components }));
  const result = await report;
  assertEquals(result.state, "down");
  assert(/Developer API \(major_outage\)/.test(result.message ?? ""), result.message);
});

/**
 * The converse: the override never makes things *better*. A healthy API
 * component during a page-wide critical incident is still `down`.
 */
Deno.test("service: a healthy Developer API cannot improve a critical roll-up", async () => {
  const { report } = run(summary({ status: { indicator: "critical" } }));
  assertEquals((await report).state, "down");
});

/**
 * Another component being unwell is reported but does not become this app's
 * verdict beyond what the vendor's own indicator already says.
 */
Deno.test("service: an unrelated component degrades only as far as the indicator says", async () => {
  const components = COMPONENTS.map((c) =>
    c.name === "Zite App Editor" ? { ...c, status: "major_outage" } : c
  );
  const { report } = run(summary({ components, status: { indicator: "minor" } }));
  const result = await report;
  assertEquals(result.state, "degraded");
  assertEquals(result.components?.["ntkf0b1l7jld"]?.state, "down");
});

Deno.test("service: group rows are skipped so nothing is double-counted", async () => {
  const { report } = run(summary({
    components: [...COMPONENTS, { id: "grp", name: "Storage", status: "operational", group: true }],
  }));
  assertEquals(Object.keys((await report).components ?? {}).length, 7);
});

Deno.test("service: open incidents and maintenance windows are counted in the message", async () => {
  const { report } = run(summary({
    incidents: [{ name: "Elevated errors", status: "investigating" }],
    scheduled_maintenances: [{}],
  }));
  const message = (await report).message ?? "";
  assert(/1 open incident\(s\)/.test(message), message);
  assert(/1 scheduled maintenance window\(s\)/.test(message), message);
});

/** A broken status API says nothing about Fillout — never `down`. */
Deno.test("service: a failing or unreadable status page is unknown", async () => {
  assertEquals((await run(undefined, 503).report).state, "unknown");
  assertEquals((await run("not json at all").report).state, "unknown");
  assertEquals((await run(summary({ components: [] })).report).state, "unknown");
});

Deno.test("service: the Statuspage vocabularies are mapped, and anything new is unknown", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("invented_later"), "unknown");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: a component with no id still gets a stable key", () => {
  assertEquals(componentKey({ id: "abc", name: "X" }, 0), "abc");
  assertEquals(componentKey({ name: "Zite App Editor" }, 3), "zite-app-editor-3");
  assertEquals(componentKey({}, 5), "component-5");
});
