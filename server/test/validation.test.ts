import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  adminRoleSchema,
  createTaskSchema,
  registerSchema,
  updateTaskSchema,
} from "#schemas";
import {
  applyTaskStatusTransition,
  getIpLookupCandidates,
  normalizeIpAddress,
} from "#utils";

const validUser = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "  Ada@Example.COM ",
  password: "Secur3Pass",
};

describe("registration schema", () => {
  test("normalises the email", () => {
    assert.equal(registerSchema.parse(validUser).email, "ada@example.com");
  });

  test("rejects weak passwords", () => {
    for (const password of [
      "short1A",
      "alllowercase1",
      "ALLUPPERCASE1",
      "NoDigitsHere",
    ]) {
      assert.equal(registerSchema.safeParse({ ...validUser, password }).success, false);
    }
  });

  test("rejects passwords over bcrypt's 72-byte limit", () => {
    const password = `Aa1${"ä".repeat(35)}`; // 3 + 70 bytes, but only 38 characters
    assert.equal(registerSchema.safeParse({ ...validUser, password }).success, false);
  });

  test("blocks mass assignment of roles", () => {
    const result = registerSchema.safeParse({ ...validUser, roles: ["super_admin"] });
    assert.equal(result.success, false);
  });
});

describe("task schemas", () => {
  test("fill defaults on create", () => {
    const task = createTaskSchema.parse({ title: "Write report" });
    assert.equal(task.status, "todo");
    assert.equal(task.priority, "medium");
    assert.equal(task.description, "");
  });

  test("cannot reassign a task to another owner", () => {
    const result = updateTaskSchema.safeParse({ owner: "64b7f0c2a1b2c3d4e5f60718" });
    assert.equal(result.success, false);
  });

  test("an empty due date clears it", () => {
    assert.equal(updateTaskSchema.parse({ dueDate: "" }).dueDate, null);
  });

  test("the admin role toggle accepts only a boolean", () => {
    assert.equal(adminRoleSchema.safeParse({ isAdmin: "true" }).success, false);
    assert.equal(adminRoleSchema.safeParse({ isAdmin: true, roles: [] }).success, false);
  });
});

describe("task completion tracking", () => {
  test("sets completedAt once when a task becomes done", () => {
    const task: { status: "todo" | "done"; completedAt: Date | null } = {
      status: "todo",
      completedAt: null,
    };
    applyTaskStatusTransition(task, "done");
    assert.ok(task.completedAt instanceof Date);

    const firstCompletion = task.completedAt;
    task.status = "done";
    applyTaskStatusTransition(task, "done");
    assert.equal(task.completedAt, firstCompletion);
  });

  test("clears completedAt when a task is reopened", () => {
    const task = { status: "done" as const, completedAt: new Date() };
    applyTaskStatusTransition(task, "in-progress");
    assert.equal(task.completedAt, null);
  });
});

describe("IP normalisation for session records", () => {
  test("strips IPv4-mapped IPv6 prefixes and ports", () => {
    assert.equal(normalizeIpAddress("::ffff:203.0.113.7"), "203.0.113.7");
    assert.equal(normalizeIpAddress("203.0.113.7:8080"), "203.0.113.7");
    assert.equal(normalizeIpAddress("[2001:db8::1]"), "2001:db8::1");
  });

  test("uses the first forwarded address and rejects garbage", () => {
    assert.equal(normalizeIpAddress("198.51.100.1, 10.0.0.1"), "198.51.100.1");
    assert.equal(normalizeIpAddress("not-an-ip"), null);
  });

  test("looks up both IPv4 spellings", () => {
    assert.deepEqual(getIpLookupCandidates("203.0.113.7"), [
      "203.0.113.7",
      "::ffff:203.0.113.7",
    ]);
  });
});
