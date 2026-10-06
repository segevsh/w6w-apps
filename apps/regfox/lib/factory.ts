import type { ActionDefinition, Param } from "@w6w/types";
import { encodeId, type QueryValue, RegfoxClient } from "./client.ts";
import { commonSearchParams, productParam, requiredId } from "./params.ts";

/**
 * The search and view endpoints share one shape — `GET /search/{resource}` with a required
 * `product` plus filters, and `GET /search/{resource}/{id}?product=` — so they are declared
 * from a table rather than copied nine times. Each action still lives in its own file.
 */
export interface SearchSpec {
  key: string;
  /** Path segment under `/search/`, e.g. `orders`. */
  segment: string;
  noun: string;
  plural: string;
  extraParams: Param[];
}

export function searchAction(spec: SearchSpec): ActionDefinition<Record<string, unknown>> {
  const params = [productParam, ...spec.extraParams, ...commonSearchParams];
  const keys = params.map((p) => p.key);
  return {
    key: spec.key,
    type: "search",
    resource: spec.noun,
    title: `Search ${spec.plural}`,
    description: `Search ${spec.plural} for a Webconnex product. Results are cursor-paged: ` +
      "pass the returned `startingAfter` back in while `hasMore` is true.",
    params,
    output: [
      { key: "items", type: "array", label: spec.plural },
      { key: "totalResults", type: "number", label: "Total matches (not the returned count)" },
      { key: "hasMore", type: "boolean", label: "More results after this page" },
      { key: "startingAfter", type: "number", label: "Cursor for the next page" },
    ],
    async execute(input, ctx) {
      const query: Record<string, QueryValue> = {};
      for (const k of keys) query[k] = input[k] as QueryValue;
      const body = await new RegfoxClient(ctx).call<unknown[]>(`/search/${spec.segment}`, {
        query,
      });
      return {
        items: body.data ?? [],
        totalResults: body.totalResults,
        hasMore: body.hasMore ?? false,
        startingAfter: body.startingAfter,
      };
    },
  };
}

export interface GetSpec {
  key: string;
  segment: string;
  noun: string;
  idKey: string;
  idLabel: string;
  /** `[]expand` values the endpoint documents; none for most. */
  expand?: string[];
}

export function getAction(spec: GetSpec): ActionDefinition<Record<string, unknown>> {
  const params: Param[] = [
    requiredId(spec.idKey, spec.idLabel),
    { ...productParam },
  ];
  if (spec.expand) {
    params.push({
      key: "expand",
      label: "Expand",
      type: "string",
      hint: `Comma-separated children to include: ${spec.expand.join(", ")}.`,
    });
  }
  return {
    key: spec.key,
    type: "read",
    resource: spec.noun,
    title: `Get ${spec.noun[0].toUpperCase()}${spec.noun.slice(1)}`,
    description: `Get one ${spec.noun} by id. The product is required by the vendor.`,
    params,
    output: [{ key: spec.noun, type: "object", label: `The ${spec.noun}` }],
    async execute(input, ctx) {
      const query: Record<string, QueryValue> = { product: input.product as string };
      if (spec.expand && input.expand) query["[]expand"] = String(input.expand);
      const body = await new RegfoxClient(ctx).call(
        `/search/${spec.segment}/${encodeId(input[spec.idKey])}`,
        { query },
      );
      return { [spec.noun]: body.data };
    },
  };
}
