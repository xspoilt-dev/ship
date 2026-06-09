import type { Field, TextField, RelationField } from "../types";

function validateTextField(field: TextField, value: unknown): string[] {
	const errors: string[] = [];
	if (typeof value !== "string") {
		errors.push(`${field.name} must be a string`);
		return errors;
	}
	const v = field.validation;
	if (v?.minLength != null && value.length < v.minLength) {
		errors.push(`${field.name} must be at least ${v.minLength} characters`);
	}
	if (v?.maxLength != null && value.length > v.maxLength) {
		errors.push(`${field.name} must be at most ${v.maxLength} characters`);
	}
	return errors;
}

function validateRelationField(field: RelationField, value: unknown): string[] {
	const errors: string[] = [];
	if (typeof value !== "string") {
		errors.push(`${field.name} must be a string (ID of related document)`);
	}
	return errors;
}

export function validateField(field: Field, value: unknown): string[] {
	if (value === undefined || value === null) {
		if (field.required) {
			return [`${field.name} is required`];
		}
		return [];
	}

	if (field.type === "text") {
		return validateTextField(field as TextField, value);
	}
	if (field.type === "relation") {
		return validateRelationField(field as RelationField, value);
	}
	return [];
}

export function validateBody(
	fields: Field[],
	body: Record<string, unknown>,
): string[] {
	return fields.flatMap((field) => validateField(field, body[field.name]));
}
