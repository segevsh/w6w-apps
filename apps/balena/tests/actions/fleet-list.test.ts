import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/fleet-list.ts";

const fleets = [
  { id: 1, app_name: "sensors", slug: "acme/sensors", is_public: false, is_archived: false },
  {
    id: 2,
    app_name: "gateways",
    slug: "acme/gateways",
    is_public: false,
    is_archived: false,
    should_track_latest_release: false,
  },
  { id: 3, app_name: "old", slug: "acme/old", is_public: false, is_archived: true },
];

/** The unfiltered listing answers for the whole platform, to anybody. */
Deno.test("fleet-list: scopes by organization membership by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { d: fleets.slice(0, 2) } }]);
  await action.execute({}, ctx);
  const filter = new URL(calls[0].url).searchParams.get("$filter")!;
  assert(/organization\/any/.test(filter), filter);
  assert(/is_archived eq false/.test(filter), filter);
});

Deno.test("fleet-list: an organization handle narrows the filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { d: fleets } }]);
  await action.execute({ organization: "acme" }, ctx);
  assert(
    new URL(calls[0].url).searchParams.get("$filter")!.includes("o/handle eq 'acme'"),
    "the handle is not in the filter",
  );
});

/** Opting into balena's own default returns strangers' fleets. */
Deno.test("fleet-list: includePublic drops the scope and warns loudly", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 200, body: { d: fleets } }]);
  await action.execute({ includePublic: true }, ctx);
  assert(
    !(new URL(calls[0].url).searchParams.get("$filter") ?? "").includes("organization_membership"),
    "the membership scope should be gone",
  );
  assert(
    logs.some((l) => l.level === "warn" && /belong to other people/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("fleet-list: returns slugs and ids, and counts archived fleets", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { d: fleets } }]);
  const result = await action.execute({ includeArchived: true }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 3);
  assertEquals(result.slugs, ["acme/sensors", "acme/gateways", "acme/old"]);
  assertEquals(result.ids, [1, 2, 3]);
  assertEquals(result.archivedCount, 1);
});

/** A fleet not tracking latest stays where it is until somebody moves it. */
Deno.test("fleet-list: names fleets that will not pick up a new build", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { d: fleets } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.notTrackingLatest, ["acme/gateways"]);
});

Deno.test("fleet-list: says the platform's public fleets come back unscoped", () => {
  assert(/PUBLIC fleets/.test(action.description!), action.description);
  assert(/no credential at all/.test(action.description!), action.description);
});
