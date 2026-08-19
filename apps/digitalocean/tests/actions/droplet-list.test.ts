import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/droplet-list.ts";

const page = (droplets: Array<[string, string, string?]>, total = droplets.length) => ({
  status: 200,
  body: {
    droplets: droplets.map(([name, status, region], i) => ({
      id: 1000 + i,
      name,
      status,
      region: { slug: region ?? "fra1" },
      size_slug: "s-1vcpu-1gb",
    })),
    meta: { total },
  },
});

Deno.test("droplet-list: lists droplets and separates the page from the total", async () => {
  const { ctx, calls } = mockCtx([page([["web", "active"], ["db", "active"]], 57)]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v2/droplets");
  assertEquals(result.count, 2);
  assertEquals(result.total, 57, "the array is a page");
  assertEquals(result.ids, [1000, 1001]);
});

/** Only `archive` stops the charge; `off` does not. */
Deno.test("droplet-list: counts the powered-off droplets and warns they still bill", async () => {
  const { ctx, logs } = mockCtx([page([["web", "active"], ["staging", "off"], ["old", "off"]])]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.activeCount, 1);
  assertEquals(result.offCount, 2);
  assertEquals(logs[0].level, "warn");
  assert(/only destroying a droplet stops the charge/.test(logs[0].message), logs[0].message);
});

Deno.test("droplet-list: an all-running account does not warn", async () => {
  const { ctx, logs } = mockCtx([page([["web", "active"]])]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.offCount, 0);
  assertEquals(logs.length, 0);
});

/** A tag is the only server-side filter and the only grouping. */
Deno.test("droplet-list: the tag is sent and the name is filtered here", async () => {
  const { ctx, calls } = mockCtx([page([["web-1", "active"], ["db-1", "active"]])]);
  const result = await action.execute({ tag: "staging", name: "WEB" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(new URL(calls[0].url).searchParams.get("tag_name"), "staging");
  assertEquals(new URL(calls[0].url).searchParams.get("name"), null);
  assertEquals(result.count, 1);
});

Deno.test("droplet-list: reports the distinct regions", async () => {
  const { ctx } = mockCtx([page([["a", "active", "fra1"], ["b", "active", "nyc3"]])]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.regions, ["fra1", "nyc3"]);
});

Deno.test("droplet-list: an empty account is not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { droplets: [], meta: { total: 0 } } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.count, 0);
  assertEquals(result.regions, []);
});
