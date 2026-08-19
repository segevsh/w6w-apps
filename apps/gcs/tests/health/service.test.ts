import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, { affectsStorage, isOpen, PRODUCT_ID, STATUS_URL } from "../../health/service.ts";

const incident = (options: {
  end?: string | null;
  products?: Array<[string, string]>;
  name?: string;
  impact?: string;
  desc?: string;
}) => ({
  id: "abc",
  external_desc: options.desc ?? "Something happened",
  service_name: options.name ?? "Multiple Products",
  status_impact: options.impact ?? "SERVICE_DISRUPTION",
  end: options.end === undefined ? "2026-07-16T12:25:00+00:00" : options.end,
  affected_products: (options.products ?? []).map(([title, id]) => ({ title, id })),
  currently_affected_locations: [{ title: "europe-west1" }],
});

const feed = (incidents: unknown[]) => ({ status: 200, body: incidents });

Deno.test("service: reads Google Cloud's incident feed", async () => {
  const { ctx, calls } = mockCtx([feed([])]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(result.state, "ok");
});

/**
 * Measured: the live feed held four incidents, all closed. Reading it as a
 * status board reports an outage that finished last month, forever.
 */
Deno.test("service: a feed of closed incidents is healthy, not an outage", async () => {
  const { ctx } = mockCtx([feed([
    incident({ products: [["Google Cloud Storage", PRODUCT_ID]] }),
    incident({ products: [["Google Cloud Storage", PRODUCT_ID]] }),
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
  assert(/no open Google Cloud incident/.test(result.message!), result.message);
});

/** The big outages are filed under "Multiple Products". */
Deno.test("service: an open multi-product incident is caught by product id", async () => {
  const { ctx } = mockCtx([feed([
    incident({
      end: null,
      name: "Multiple Products",
      products: [["Bare Metal Solution", "5gQF"], ["Google Cloud Storage", PRODUCT_ID]],
      desc: "Elevated error rates",
    }),
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/Elevated error rates/.test(result.message!), result.message);
  assert(/europe-west1/.test(result.message!), result.message);
});

/** Matching on the name alone would miss exactly the large outages. */
Deno.test("service: an incident naming other products only is ignored", async () => {
  const { ctx } = mockCtx([feed([
    incident({ end: null, products: [["VMWare engine", "9H6g"], ["Media CDN", "FK8W"]] }),
  ])]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

/**
 * `Cloud Storage for Firebase` and `Storage Transfer Service` both contain the
 * word, and neither is this product.
 */
Deno.test("service: a similarly named product does not count as this one", async () => {
  const { ctx } = mockCtx([feed([
    incident({
      end: null,
      products: [["Cloud Storage for Firebase", "aY6Fbgy6TV4YWoutjhfe"], [
        "Storage Transfer Service",
        "reC3xJSY6Gzc8n9eYmmj",
      ]],
    }),
  ])]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

/** `status_impact` is the field, not `severity`. */
Deno.test("service: an informational notice is not a disruption", async () => {
  const { ctx } = mockCtx([feed([
    incident({
      end: null,
      impact: "SERVICE_INFORMATION",
      products: [["Google Cloud Storage", PRODUCT_ID]],
    }),
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
  assert(/1 open incident/.test(result.message!), result.message);
});

Deno.test("service: a broken, non-list or unreachable feed is unknown", async () => {
  const html = mockCtx([{ status: 200, body: "<html/>" }]);
  assertEquals((await service.check!({}, html.ctx)).state, "unknown");

  const object = mockCtx([{ status: 200, body: { incidents: [] } }]);
  assertEquals((await service.check!({}, object.ctx)).state, "unknown");

  const errored = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, errored.ctx)).state, "unknown");

  const offline = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof service.check>>[1];
  assertEquals((await service.check!({}, offline)).state, "unknown");
});

Deno.test("isOpen and affectsStorage do the two things the filter needs", () => {
  assert(isOpen({ end: null }));
  assert(isOpen({}));
  assert(!isOpen({ end: "2026-07-16T12:25:00+00:00" }));
  assert(affectsStorage({ affected_products: [{ id: PRODUCT_ID }] }));
  assert(!affectsStorage({ affected_products: [{ id: "other" }] }));
  assert(!affectsStorage({}));
});

/** A Cloud Storage outage is regional far more often than global. */
Deno.test("service: never claims down, and says the feed is an archive", () => {
  assert(/archive of recent incidents/.test(service.description!), service.description);
  assert(
    /matching on the name misses exactly the large ones/.test(service.description!),
    service.description,
  );
  assertEquals(service.severity, "informational");
});
