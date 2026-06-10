import { describe, it, expect } from "bun:test";
import { validateField, validateBody } from "../../src/schema/validation";
import type { Field } from "../../src/types";

describe("validateField", () => {
	it("returns error for missing required text field", () => {
		const field: Field = { name: "name", type: "text", required: true };
		expect(validateField(field, undefined)).toEqual(["name is required"]);
		expect(validateField(field, null)).toEqual(["name is required"]);
	});

	it("returns empty for missing optional field", () => {
		const field: Field = { name: "name", type: "text", required: false };
		expect(validateField(field, undefined)).toEqual([]);
		expect(validateField(field, null)).toEqual([]);
	});

	it("validates text field type", () => {
		const field: Field = { name: "name", type: "text", required: true };
		expect(validateField(field, 42)).toEqual(["name must be a string"]);
		expect(validateField(field, true)).toEqual(["name must be a string"]);
		expect(validateField(field, "hello")).toEqual([]);
	});

	it("validates text minLength", () => {
		const field: Field = {
			name: "name",
			type: "text",
			required: true,
			validation: { minLength: 3 },
		};
		expect(validateField(field, "ab")).toEqual([
			"name must be at least 3 characters",
		]);
		expect(validateField(field, "abc")).toEqual([]);
	});

	it("validates text maxLength", () => {
		const field: Field = {
			name: "name",
			type: "text",
			required: true,
			validation: { maxLength: 5 },
		};
		expect(validateField(field, "toolong")).toEqual([
			"name must be at most 5 characters",
		]);
		expect(validateField(field, "short")).toEqual([]);
	});

	it("validates relation field type", () => {
		const field: Field = {
			name: "author",
			type: "relation",
			required: true,
			relationTo: { slug: "authors" },
		};
		expect(validateField(field, 42)).toEqual([
			"author must be a string (ID of related document)",
		]);
		expect(validateField(field, "some-id")).toEqual([]);
	});

	it("returns empty for unknown field types", () => {
		const field: Field = { name: "score", type: "number", required: true };
		expect(validateField(field, 42)).toEqual([]);
	});
});

describe("validateBody", () => {
	it("validates all fields and returns combined errors", () => {
		const fields: Field[] = [
			{ name: "title", type: "text", required: true, validation: { minLength: 2 } },
			{ name: "author", type: "relation", required: true, relationTo: { slug: "authors" } },
		];
		const errors = validateBody(fields, { title: "A", author: 123 });
		expect(errors).toContain("title must be at least 2 characters");
		expect(errors).toContain("author must be a string (ID of related document)");
	});

	it("returns empty when all fields pass", () => {
		const fields: Field[] = [
			{ name: "title", type: "text", required: true },
		];
		expect(validateBody(fields, { title: "Valid Title" })).toEqual([]);
	});
});
