// src/lib/roles.ts
import type { Role } from "../server/accounts";

export const homeFor = (role: Role): "/teacher" | "/learn" => (role === "teacher" ? "/teacher" : "/learn");
