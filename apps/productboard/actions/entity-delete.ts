import type { ActionDefinition } from "@w6w/types";
import { type DeleteResult, encodeId, ProductboardClient } from "../lib/client.ts";
import { entityIdParam } from "../lib/params.ts";

/**
 * `DELETE /v2/entities/{id}` — delete an entity. **Cascading, with no warning.**
 *
 * This is the single most dangerous call in the API, and the danger is new in
 * v2. The vendor's migration guide states the change plainly:
 *
 *   | Entity                        | v1 behaviour                    | v2 behaviour                          |
 *   | ----------------------------- | ------------------------------- | ------------------------------------- |
 *   | Feature with subfeatures      | blocked — delete children first | **cascade** — subfeatures removed too |
 *   | Release group with releases   | blocked — error returned        | **cascade** — releases removed too    |
 *   | Release with assignments      | blocked                         | release deleted, features unaffected  |
 *
 * and adds: *"If your integration relied on v1's safeguard behavior — for
 * example, treating a blocked delete as a signal that children exist — that
 * safety net is gone in v2. An accidental delete of a parent entity will now
 * remove all its children without warning."*
 *
 * There is no dry-run, no `force` flag and no undo. The vendor's own suggested
 * workaround is a pre-deletion check, so this action implements it: with
 * `checkChildrenFirst` on (the default), it calls
 * `GET /v2/entities?parent[id]={id}` and refuses if anything comes back,
 * naming what it found. Turning it off costs one request and is the explicit,
 * deliberate way to say "yes, take the subtree".
 *
 * **Idempotent.** Deleting an already-deleted entity is the same end state; the
 * second call answers 404, which is reported rather than swallowed so a
 * workflow does not mistake "wrong id" for "already done".
 */
interface Input {
  entityId: string;
  checkChildrenFirst?: boolean;
}

const entityDelete: ActionDefinition<Input, DeleteResult> = {
  key: "entity-delete",
  type: "perform",
  resource: "entity",
  title: "Delete entity",
  description:
    "Delete an entity. In API v2 this CASCADES — deleting a feature deletes its subfeatures and " +
    "deleting a release group deletes its releases, with no warning and no undo.",
  idempotent: true,
  params: [
    entityIdParam,
    {
      key: "checkChildrenFirst",
      label: "Refuse if the entity has children",
      type: "boolean",
      default: true,
      hint:
        "On by default. Lists children first and aborts if any exist, because a v2 delete removes " +
        "them silently. Turn it off only when you mean to delete the whole subtree.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
    { key: "deleted", type: "boolean", label: "The entity was deleted" },
  ],

  async execute(input, ctx) {
    const client = new ProductboardClient(ctx);
    const id = encodeId(input.entityId);

    if (input.checkChildrenFirst !== false) {
      const children = await client.list<{ id?: string; type?: string }>("/entities", {
        query: { "parent[id]": input.entityId },
      });
      if (children.items.length > 0) {
        const preview = children.items
          .slice(0, 5)
          .map((c) => `${c?.type ?? "entity"} ${c?.id ?? "?"}`)
          .join(", ");
        throw new Error(
          `Refusing to delete ${input.entityId}: it has ${children.items.length} child ` +
            `entit${children.items.length === 1 ? "y" : "ies"} (${preview}${
              children.hasMore ? ", and more" : ""
            }) which a v2 delete would remove too. Set "Refuse if the entity has children" to ` +
            "false to delete the whole subtree deliberately.",
        );
      }
    }

    ctx.log("warn", "deleting Productboard entity (cascades to children)", { id: input.entityId });
    const status = await client.status(`/entities/${id}`, { method: "DELETE" });
    return { status, deleted: status === 204 };
  },
};

export default entityDelete;
