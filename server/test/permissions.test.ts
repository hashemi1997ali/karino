import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { getStaffCapabilities, resolveRoleTier } from "../src/ai/policies/index.ts";
import { canManageBan, isStaffRoles } from "#utils";

const USER = ["user"];
const ADMIN = ["user", "admin"];
const SUPER = ["user", "super_admin"];

describe("ban / delete hierarchy", () => {
  const cases: Array<[actor: string[], target: string[], allowed: boolean]> = [
    [USER, USER, false],
    [ADMIN, USER, true],
    [ADMIN, ADMIN, false],
    [ADMIN, SUPER, false],
    [SUPER, USER, true],
    [SUPER, ADMIN, true],
    [SUPER, SUPER, false],
  ];

  for (const [actor, target, allowed] of cases) {
    test(`${actor.at(-1)} -> ${target.at(-1)}: ${allowed ? "allowed" : "denied"}`, () => {
      assert.equal(canManageBan(actor, target), allowed);
    });
  }

  test("only admins and super admins count as staff", () => {
    assert.equal(isStaffRoles(USER), false);
    assert.equal(isStaffRoles(ADMIN), true);
    assert.equal(isStaffRoles(SUPER), true);
  });
});

describe("assistant role tiers", () => {
  test("unauthenticated requests are guests even with forged roles", () => {
    assert.equal(
      resolveRoleTier({ authenticated: false, roles: SUPER, locale: "en" }),
      "guest",
    );
  });

  test("admins cannot change admin roles, super admins can", () => {
    assert.equal(getStaffCapabilities("admin").promoteAdmin, false);
    assert.equal(getStaffCapabilities("super_admin").promoteAdmin, true);
    assert.equal(getStaffCapabilities("user").banUsers, false);
  });
});
