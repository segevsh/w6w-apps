import { goalPostAction } from "../lib/factories.ts";

/** `POST /users/u/goals/g/uncleme.json` */
export default goalPostAction(
  "uncle-goal",
  "Call Uncle (Derail Goal)",
  "USE AT YOUR OWN RISK. Instantly derail a goal that is in a beemergency (red, zero safe " +
    "days): stops alerts, CHARGES the pledge to you and all Groupies, and inserts the " +
    "post-derail respite. No takebacks, no refunds. Fails if the goal has buffer left.",
  "uncleme",
  false,
);
