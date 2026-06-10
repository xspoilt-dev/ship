import type { Field, TextField, SelectField, RelationField } from "../types";

function validateTextField(field: TextField, value: unknown): string[] {
	const errors: string[] = [];
	if (typeof value !== "string") {
		errors.push(`${field.name} must be a string`);
		return errors;
	}
	const v = field.validation;
	if (v?.minLength != null && value.length < v.minLength) {
		errors.push(
			`${field.name} must be at least ${v.minLength} characters`,
		);
	}
	if (v?.maxLength != null && value.length > v.maxLength) {
		errors.push(
			`${field.name} must be at most ${v.maxLength} characters`,
		);
	}
	if (v?.pattern != null && !v.pattern.test(value)) {
		errors.push(`${field.name} has an invalid format`);
	}
	return errors;
}

function validateSelectField(
	field: SelectField,
	value: unknown,
): string[] {
	const errors: string[] = [];
	const validValues = field.options.map((o) => o.value);

	if (field.hasMany) {
		if (!Array.isArray(value)) {
			errors.push(`${field.name} must be an array`);
			return errors;
		}
		for (const item of value) {
			if (!validValues.includes(item as string)) {
				errors.push(
					`${field.name} contains invalid value "${item}"`,
				);
			}
		}
	} else {
		if (typeof value !== "string") {
			errors.push(`${field.name} must be a string`);
			return errors;
		}
		if (!validValues.includes(value)) {
			errors.push(
				`${field.name} must be one of: ${validValues.join(", ")}`,
			);
		}
	}
	return errors;
}

function validateRelationField(
	field: RelationField,
	value: unknown,
): string[] {
	const errors: string[] = [];
	if (typeof value !== "string") {
		errors.push(
			`${field.name} must be a string (ID of related document)`,
		);
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
		return validateTextField(field, value);
	}
	if (field.type === "select") {
		return validateSelectField(field, value);
	}
	if (field.type === "relation") {
		return validateRelationField(field, value);
	}
	return [];
}

export function validateBody(
	fields: Field[],
	body: Record<string, unknown>,
): string[] {
	return fields.flatMap((field) => validateField(field, body[field.name]));
}
