import { describe, expect, it } from "vitest";
import { findEmailProblem, normaliseEmail } from "@/lib/email";
import { cleanFirstName, greetingFor } from "@/lib/name";

describe("findEmailProblem", () => {
  it.each([
    ["", "missing"],
    ["   ", "missing"],
    ["alex.company.com", "noAt"],
    ["alex@company", "noDomainEnding"],
    ["alex@company.c", "noDomainEnding"],
    ["al ex@company.com", "noDomainEnding"],
    [`${"a".repeat(250)}@company.com`, "noDomainEnding"],
  ])("classifies %j as %s", (input, problem) => {
    expect(findEmailProblem(input)).toBe(problem);
  });

  it("accepts a normal address", () => {
    expect(findEmailProblem(" alex@company.com ")).toBeNull();
  });

  it("normalises case and whitespace", () => {
    expect(normaliseEmail(" Alex@Company.COM ")).toBe("alex@company.com");
  });
});

describe("cleanFirstName", () => {
  it.each([
    ["  Alex ", "Alex"],
    ["Zoë", "Zoë"],
    ["Jean-Luc", "Jean-Luc"],
    ["O'Brien", "O'Brien"],
    ["Anna  Maria", "Anna Maria"],
    ["Łukasz", "Łukasz"],
    ["李", "李"],
  ])("keeps %j as %j", (input, output) => {
    expect(cleanFirstName(input)).toBe(output);
  });

  it.each([
    "Alex2",
    "visit https://spam.example",
    "spam.example",
    "<b>Alex</b>",
    "Alex!",
    "-Alex",
    "a".repeat(41),
    "Win €100 now",
  ])("empties %j", (input) => {
    expect(cleanFirstName(input)).toBe("");
  });

  it("empties non-strings", () => {
    expect(cleanFirstName(42)).toBe("");
    expect(cleanFirstName(undefined)).toBe("");
  });

  it("accepts exactly forty letters", () => {
    expect(cleanFirstName("a".repeat(40))).toBe("a".repeat(40));
  });
});

describe("greetingFor", () => {
  it("prefers the first name", () => {
    expect(greetingFor("Alex", "info@company.com")).toBe("Alex");
  });

  it("uses a name-like local part with a capital", () => {
    expect(greetingFor("", "julius@company.com")).toBe("Julius");
  });

  it.each([
    "j.grimm93@company.com",
    "x@company.com",
    "info2@company.com",
    `${"a".repeat(21)}@x.de`,
  ])("falls back to there for %s", (email) => {
    expect(greetingFor("", email)).toBe("there");
  });
});
