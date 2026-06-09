export interface Access {
	read: () => boolean;
	create: () => boolean;
	update: () => boolean;
	delete: () => boolean;
}

export interface TextValidation {
	minLength?: number;
	maxLength?: number;
}

export interface Field {
	name: string;
	type: string;
	required: boolean;
	validation?: TextValidation;
	relationTo?: { slug: string };
}

export interface TextField extends Field {
	type: "text";
	validation?: TextValidation;
}

export interface RelationField extends Field {
	type: "relation";
	relationTo: { slug: string };
}

export type FieldType = "text" | "relation" | "number" | "boolean";

export interface CollectionConfig {
	slug: string;
	access: Access;
	fields: Field[];
}

export interface DatabaseConfig {
	adapter: "memory" | "sqlite" | "postgres" | "mongodb";
	url?: string;
}

export interface ShipConfig {
	database?: DatabaseConfig;
	collections: CollectionConfig[];
	http?: {
		port?: number;
		cors?: string[] | boolean;
	};
}
