import type { Store, StoredDocument } from "./types";

export class MemoryAdapter implements Store {
	private collections = new Map<string, Map<string, StoredDocument>>();
	private sequences = new Map<string, number>();

	private getCollection(slug: string): Map<string, StoredDocument> {
		let col = this.collections.get(slug);
		if (!col) {
			col = new Map();
			this.collections.set(slug, col);
			this.sequences.set(slug, 0);
		}
		return col;
	}

	private nextId(slug: string): string {
		const seq = (this.sequences.get(slug) ?? 0) + 1;
		this.sequences.set(slug, seq);
		return String(seq);
	}

	async list(
		slug: string,
	): Promise<{ data: StoredDocument[]; total: number }> {
		const col = this.getCollection(slug);
		const data = Array.from(col.values());
		return { data, total: data.length };
	}

	async get(slug: string, id: string): Promise<StoredDocument | null> {
		const col = this.getCollection(slug);
		return col.get(id) ?? null;
	}

	async create(
		slug: string,
		body: Record<string, unknown>,
	): Promise<StoredDocument> {
		const col = this.getCollection(slug);
		const id = this.nextId(slug);
		const doc: StoredDocument = { id, ...body };
		col.set(id, doc);
		return doc;
	}

	async update(
		slug: string,
		id: string,
		body: Record<string, unknown>,
	): Promise<StoredDocument | null> {
		const col = this.getCollection(slug);
		const existing = col.get(id);
		if (!existing) return null;
		const updated: StoredDocument = { ...existing, ...body, id };
		col.set(id, updated);
		return updated;
	}

	async delete(slug: string, id: string): Promise<boolean> {
		const col = this.getCollection(slug);
		return col.delete(id);
	}
}
