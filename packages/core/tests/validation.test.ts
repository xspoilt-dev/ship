import { describe, it, expect } from "bun:test";
import { validateField, validateBody } from "../src/schema/validation";
import type { Field } from "../src/types";

describe("validateField", () => {
	it("returns error for missing required text field", () => {
		const field: Field = {
			name: "name",
			type: "text",
			required: true,
		} as Field;
		expect(validateField(field, undefined)).toEqual(["name is required"]);
		expect(validateField(field, null)).toEqual(["name is required"]);
	});

	it("returns empty for missing optional field", () => {
		const field: Field = {
			name: "name",
			type: "text",
			required: false,
		} as Field;
		expect(validateField(field, undefined)).toEqual([]);
		expect(validateField(field, null)).toEqual([]);
	});

	it("validates text field type", () => {
		const field: Field = {
			name: "name",
			type: "text",
			required: true,
		} as Field;
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
		} as Field;
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
		} as Field;
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
			relationTo: "authors",
		} as Field;
		expect(validateField(field, 42)).toEqual([
			"author must be a string (ID of related document)",
		]);
		expect(validateField(field, "some-id")).toEqual([]);
	});

	it("validates text pattern", () => {
		const field: Field = {
			name: "email",
			type: "text",
			required: true,
			validation: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
		} as Field;
		expect(validateField(field, "notanemail")).toEqual([
			"email has an invalid format",
		]);
		expect(validateField(field, "test@example.com")).toEqual([]);
	});

	it("validates select field", () => {
		const field: Field = {
			name: "role",
			type: "select",
			required: true,
			options: [
				{ label: "Admin", value: "admin" },
				{ label: "User", value: "user" },
			],
		} as Field;
		expect(validateField(field, "admin")).toEqual([]);
		expect(validateField(field, "superadmin")).toEqual([
			"role must be one of: admin, user",
		]);
		expect(validateField(field, 42)).toEqual(["role must be a string"]);
	});

	it("validates select field with hasMany", () => {
		const field: Field = {
			name: "roles",
			type: "select",
			required: true,
			hasMany: true,
			options: [
				{ label: "Admin", value: "admin" },
				{ label: "Editor", value: "editor" },
			],
		} as Field;
		expect(validateField(field, ["admin", "editor"])).toEqual([]);
		expect(validateField(field, ["admin", "bogus"])).toEqual([
			'roles contains invalid value "bogus"',
		]);
		expect(validateField(field, "admin")).toEqual([
			"roles must be an array",
		]);
	});

	it("returns empty for unknown field types", () => {
		const field = { name: "score", type: "number", required: true } as Field;
		expect(validateField(field, 42)).toEqual([]);
	});
});

describe("validateBody", () => {
	it("validates all fields and returns combined errors", () => {
		const fields: Field[] = [
			{
				name: "title",
				type: "text",
				required: true,
				validation: { minLength: 2 },
			} as Field,
			{
				name: "author",
				type: "relation",
				required: true,
				relationTo: "authors",
			} as Field,
		];
		const errors = validateBody(fields, { title: "A", author: 123 });
		expect(errors).toContain("title must be at least 2 characters");
		expect(errors).toContain(
			"author must be a string (ID of related document)",
		);
	});

	it("returns empty when all fields pass", () => {
		const fields: Field[] = [
			{
				name: "title",
				type: "text",
				required: true,
			} as Field,
		];
		expect(validateBody(fields, { title: "Valid Title" })).toEqual([]);
	});
});
