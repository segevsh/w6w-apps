/**
 * The three shapes most MailerSend endpoints take, so each action file states only what
 * is particular to it: its path, its parameters, its vendor-documented caveats.
 */
import type { ActionDefinition, Param } from "@w6w/types";
import { MailerSendClient, type QueryValue, seg } from "./client.ts";

type Meta = Pick<ActionDefinition, "key" | "title" | "description"> & { resource: string };

/** `GET /things/{id}` -> the vendor body (`{ data: {...} }`) verbatim. */
export function getById(
  meta: Meta & { path: (id: string) => string; idKey: string; idLabel: string; idHint?: string },
): ActionDefinition<Record<string, string>> {
  return {
    key: meta.key,
    type: "read",
    resource: meta.resource,
    title: meta.title,
    description: meta.description,
    params: [{
      key: meta.idKey,
      label: meta.idLabel,
      type: "string",
      required: true,
      hint: meta.idHint,
    }],
    output: [{ key: "data", type: "object", label: `The ${meta.resource}` }],
    execute(input, ctx) {
      return new MailerSendClient(ctx).json(meta.path(input[meta.idKey]));
    },
  };
}

/** `DELETE /things/{id}` -> `{ deleted: true }`. The vendor answers 200/204 with no body. */
export function deleteById(
  meta: Meta & { path: (id: string) => string; idKey: string; idLabel: string; idHint?: string },
): ActionDefinition<Record<string, string>> {
  return {
    key: meta.key,
    type: "perform",
    resource: meta.resource,
    title: meta.title,
    description: meta.description,
    // A repeat call answers 404, which surfaces as an error, so it is not retry-safe.
    idempotent: false,
    params: [{
      key: meta.idKey,
      label: meta.idLabel,
      type: "string",
      required: true,
      hint: meta.idHint,
    }],
    output: [{ key: "deleted", type: "boolean", label: "True when the call succeeded" }],
    async execute(input, ctx) {
      await new MailerSendClient(ctx).request(meta.path(input[meta.idKey]), { method: "DELETE" });
      return { deleted: true };
    },
  };
}

/** `GET /things?…` -> the vendor page (`data`, `links`, `meta`) verbatim. */
export function listOf<I extends Record<string, unknown>>(
  meta: Meta & {
    path: (input: I) => string;
    params: Param[];
    query: (input: I) => Record<string, QueryValue>;
    output: NonNullable<ActionDefinition["output"]>;
  },
): ActionDefinition<I> {
  return {
    key: meta.key,
    type: "search",
    resource: meta.resource,
    title: meta.title,
    description: meta.description,
    params: meta.params,
    output: meta.output,
    execute(input, ctx) {
      return new MailerSendClient(ctx).json(meta.path(input), { query: meta.query(input) });
    },
  };
}

export { seg };
