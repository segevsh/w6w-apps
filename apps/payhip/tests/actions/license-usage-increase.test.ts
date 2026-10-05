import action from "../../actions/license-usage-increase.ts";
import { putSuite } from "../_suite.ts";

putSuite("license-usage-increase", action, "usage");
