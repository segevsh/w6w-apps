import action from "../../actions/get-domain.ts";
import { testGetById } from "../_shapes.ts";

testGetById("get-domain", action, "domainId", "/v1/domains/{id}");
