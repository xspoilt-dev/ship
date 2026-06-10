import type { Access, Field, AuthConfig } from "./types";

export function defineCollection<
	TFields extends readonly Field[],
	TAuth extends AuthConfig | undefined = undefined,
>(config: {
	slug: string;
	access: Access;
	fields: TFields;
	auth?: TAuth;
}): {
	slug: string;
	access: Access;
	fields: TFields;
	auth?: TAuth;
} {
	return config;
}
