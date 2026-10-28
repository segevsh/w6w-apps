import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/container-list.ts";

const D = { display: { account: "myaccount" } };

const page = (containers: Array<[string, string?]>) => ({
  status: 200,
  body: `<EnumerationResults><Containers>${
    containers.map(([name, access]) =>
      `<Container><Name>${name}</Name><Properties>${
        access ? `<PublicAccess>${access}</PublicAccess>` : ""
      }</Properties></Container>`
    ).join("")
  }</Containers><NextMarker /></EnumerationResults>`,
});

Deno.test("container-list: lists the account's containers", async () => {
  const { ctx, calls } = mockCtx([page([["uploads"], ["logs"]])], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  const url = new URL(calls[0].url);
  assertEquals(url.host, "myaccount.blob.core.windows.net");
  assertEquals(url.searchParams.get("comp"), "list");
  assertEquals(result.names, ["uploads", "logs"]);
  assertEquals(result.count, 2);
});

/** Neither level shows up as an error anywhere. */
Deno.test("container-list: counts both public levels and separates the listable ones", async () => {
  const { ctx, logs } = mockCtx([page([["a"], ["b", "blob"], ["c", "container"]])], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.publicCount, 2);
  assertEquals(result.publiclyListable, ["c"], "only `container` allows listing");
  assertEquals(logs[0].level, "warn");
  assert(/open to anonymous access/.test(logs[0].message), logs[0].message);
});

Deno.test("container-list: a private account does not warn", async () => {
  const { ctx, logs } = mockCtx([page([["a"], ["b"]])], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.publicCount, 0);
  assertEquals(logs.length, 0);
});

/** `<NextMarker />` is how Azure says this is the last page. */
Deno.test("container-list: an empty marker is no marker", async () => {
  const { ctx } = mockCtx([page([["a"]])], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.nextMarker, undefined);
});

Deno.test("container-list: a marker and a prefix are passed through", async () => {
  const { ctx, calls } = mockCtx([page([])], D);
  await action.execute({ prefix: "app-", marker: "tok", includeMetadata: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("prefix"), "app-");
  assertEquals(url.searchParams.get("marker"), "tok");
  assertEquals(url.searchParams.get("include"), "metadata");
});

Deno.test("container-list: the page size is clamped to Azure's maximum", async () => {
  const { ctx, calls } = mockCtx([page([])], D);
  await action.execute({ maxResults: 99999 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("maxresults"), "5000");
});
