export interface StoredDocument {
	id: string;
	[key: string]: unknown;
}

export interface Store {
	list(slug: string): Promise<{ data: StoredDocument[]; total: number }>;
	get(slug: string, id: string): Promise<StoredDocument | null>;
	create(
		slug: string,
		body: Record<string, unknown>,
	): Promise<StoredDocument>;
	update(
		slug: string,
		id: string,
		body: Record<string, unknown>,
	): Promise<StoredDocument | null>;
	delete(slug: string, id: string): Promise<boolean>;
}
