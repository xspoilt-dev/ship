import type { Access, Field } from "./types";

export function defineCollection<TFields extends readonly Field[]>(config: {
	slug: string;
	access: Access;
	fields: TFields;
}): {
	slug: string;
	access: Access;
	fields: TFields;
} {
	return config;
}
