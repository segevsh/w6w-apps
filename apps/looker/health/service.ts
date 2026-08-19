import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Looker up? — declared **unavailable**, and the reason is structural.
 *
 * ## There is no Looker to have a status
 *
 * Every Looker deployment is its own instance. A Looker-hosted one runs on
 * Google Cloud at `{name}.cloud.looker.com`; a self-hosted one runs on the
 * customer's own machines. There is no shared service whose health would be
 * meaningful, and Google's Cloud status page reports the *platform* rather than
 * any particular tenant.
 *
 * This is the same shape of absence as `apps/mastodon` — software many people
 * run, rather than a service one company operates — with an extra layer: even
 * the hosted instances are separate deployments, and an incident on one says
 * nothing about another.
 *
 * ## And the interesting failure is not Looker's anyway
 *
 * A Looker that is up and a warehouse that is down looks, from a workflow, like
 * a Looker failure: the query hangs or errors, and the error comes back through
 * Looker. The health of a Looker deployment is really the health of Looker
 * *plus* whichever database the model points at, and no status page anywhere
 * covers that pair.
 *
 * The `instance` check reaches this connection's own Looker, which is the
 * question that can be answered.
 */
const check: HealthCheckDefinition = {
  key: "service",
  kind: "service",
  scope: "app",
  credential: "none",
  title: "Looker status",
  description:
    "Declared unavailable — there is no Looker service to have a status. Every deployment is its " +
    "own instance, hosted or self-hosted, so an app-scoped check has nothing to read. The " +
    "`instance` check answers this for a particular connection.",
  covers: ["service"],
  severity: "informational",
  unavailable: {
    reason: "Looker is not one service. Each deployment is its own instance — Looker-hosted at " +
      "`{name}.cloud.looker.com`, or self-hosted on the customer's own machines — so there is no " +
      "shared health that would mean anything, and Google Cloud's status page reports the " +
      "platform rather than any tenant. The same shape as apps/mastodon, with an extra layer: " +
      "even hosted instances are separate deployments and an incident on one says nothing about " +
      "another. Nor would it be the whole question: Looker queries the customer's warehouse, so " +
      "a healthy Looker in front of a struggling database presents to a workflow as a Looker " +
      "failure, and no status page covers that pair. The `instance` check reaches this " +
      "connection's own deployment, which is the answerable version.",
  },
};

export default check;
