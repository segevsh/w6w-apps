import { webhookTrigger } from "../lib/triggers.ts";

/** Any deploy notification; the run's `state` says which fired. */
const deploy = webhookTrigger({
  key: "deploy",
  title: "Deploy Event",
  description:
    "Fires on the Netlify deploy notification you point at it (deploy started, succeeded, failed, locked and more). The run gets the deploy, its state and the site.",
});

export default deploy;
