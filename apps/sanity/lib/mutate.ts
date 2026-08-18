import type { HookContext } from "@w6w/types";
import { compact, SanityClient } from "./client.ts";

/**
 * One place where every mutating action lands.
 *
 * Sanity's mutation endpoint is transactional — *"if the operation succeeds you
 * can rest assured that every mutation you submitted was executed"* — so this
 * takes an array and submits it as one transaction rather than looping.
 *
 * `live: true` is not optional. Sanity's CDN caches `/data/query` and
 * `/graphql` and **rejects every other POST**, so a mutation on a
 * CDN-configured connection has to be routed to the live host or it never
 * happens.
 */
export interface MutateOptions {
  dataset: string;
  dryRun?: unknown;
  returnDocuments?: unknown;
  visibility?: unknown;
  transactionId?: unknown;
  /** Sanity's own default is `false`; array items without a `_key` break the Studio. */
  autoGenerateArrayKeys?: boolean;
}

export interface MutationResponse {
  transactionId?: string;
  results?: Array<{ operation?: string; documentId?: string }>;
  documents?: unknown[];
}

export async function mutate(
  ctx: HookContext,
  mutations: unknown[],
  options: MutateOptions,
): Promise<MutationResponse & { dryRun: boolean }> {
  const client = new SanityClient(ctx);
  const dryRun = options.dryRun === true;

  const body = await client.request<MutationResponse>(
    `/data/mutate/${encodeURIComponent(options.dataset)}`,
    {
      method: "POST",
      // Writes never go through the CDN — it rejects any POST that is not a
      // query.
      live: true,
      query: compact({
        returnIds: true,
        returnDocuments: options.returnDocuments === true ? true : undefined,
        dryRun: dryRun ? true : undefined,
        visibility: String(options.visibility ?? "") || undefined,
        transactionId: String(options.transactionId ?? "") || undefined,
        // Array items need a `_key` to be addressable in Sanity's realtime
        // editing model; without one the Studio cannot edit the array.
        autoGenerateArrayKeys: options.autoGenerateArrayKeys === false ? undefined : true,
      }) as Record<string, string | number | boolean | undefined>,
      body: { mutations },
    },
  );

  return { ...body, dryRun };
}

/**
 * Sanity's silent ceiling on query-based mutations.
 *
 * Its own documentation: *"A mutation that specifies a query can only operate
 * on up to 10,000 documents! This means that a mutation based on a query such
 * as `*[_type == "article"]` is in fact executed as if the query were written
 * `*[_type == "article"][0..10000]`."*
 *
 * It does not fail — it quietly does part of the job, which is worse. Every
 * action that accepts a query says so.
 */
export const QUERY_MUTATION_LIMIT = 10000;

export const QUERY_LIMIT_HINT =
  `⚠️ A query-based mutation silently stops at ${QUERY_MUTATION_LIMIT} documents — Sanity ` +
  "executes it as if the query ended `[0..10000]`, with no error. Paginate by `_id` for more.";
