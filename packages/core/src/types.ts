import type { Store } from "./store/types";

export interface RequestContext {
	user?: Record<string, unknown> | null;
}

export type AccessFn = (
	ctx: RequestContext,
	doc?: Record<string, unknown>,
) => boolean;

export interface Access {
	read: AccessFn;
	create: AccessFn;
	update: AccessFn;
	delete: AccessFn;
}

export interface TextValidation {
	minLength?: number;
	maxLength?: number;
	pattern?: RegExp;
}

export interface AuthConfig {
	type: "email";
	fields: {
		email: string;
		password: string;
	};
}

export interface BaseField {
	name: string;
	required: boolean;
	unique?: boolean;
	index?: boolean;
	hidden?: boolean;
	encrypted?: boolean;
	defaultValue?: unknown;
}

export interface TextField extends BaseField {
	type: "text";
	validation?: TextValidation;
}

export interface SelectField extends BaseField {
	type: "select";
	options: { label: string; value: string }[];
	hasMany?: boolean;
}

export interface RelationField extends BaseField {
	type: "relation";
	relationTo: string;
}

export type Field = TextField | SelectField | RelationField;

export type FieldType = Field["type"];

export interface CollectionConfig {
	slug: string;
	access: Access;
	auth?: AuthConfig;
	fields: Field[];
}

export interface ShipConfig {
	database?: Store;
	collections: CollectionConfig[];
	http?: {
		port?: number;
		cors?: string[] | boolean;
	};
}
