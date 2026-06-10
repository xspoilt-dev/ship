import { Database } from "bun:sqlite";
import type { Store, StoredDocument } from "ship";

export interface SqliteAdapterConfig {
	url?: string;
}

export class SqliteAdapter implements Store {
	private db: Database;

	constructor(config: SqliteAdapterConfig = {}) {
		this.db = new Database(config.url ?? "ship.db");
		this.db.exec("PRAGMA journal_mode=WAL");
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS ship_documents (
				id TEXT PRIMARY KEY,
				slug TEXT NOT NULL,
				data TEXT NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			)
		`);
		this.db.exec(
			"CREATE INDEX IF NOT EXISTS idx_ship_documents_slug ON ship_documents(slug)",
		);
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS ship_sequences (
				slug TEXT PRIMARY KEY,
				value INTEGER NOT NULL DEFAULT 0
			)
		`);
	}

	private nextId(slug: string): string {
		const query = this.db.query(
			"SELECT value FROM ship_sequences WHERE slug = ?",
		);
		const row = query.get(slug) as { value: number } | null;

		if (row) {
			const newVal = row.value + 1;
			this.db.run(
				"UPDATE ship_sequences SET value = ? WHERE slug = ?",
				[newVal, slug],
			);
			return String(newVal);
		}

		this.db.run(
			"INSERT INTO ship_sequences (slug, value) VALUES (?, 1)",
			[slug],
		);
		return "1";
	}

	async list(
		slug: string,
	): Promise<{ data: StoredDocument[]; total: number }> {
		const query = this.db.query(
			"SELECT * FROM ship_documents WHERE slug = ? ORDER BY rowid",
		);
		const rows = query.all(slug) as Array<{
			id: string;
			slug: string;
			data: string;
			created_at: string;
			updated_at: string;
		}>;
		const data = rows.map((r) => ({ id: r.id, ...JSON.parse(r.data) }));
		return { data, total: data.length };
	}

	async get(slug: string, id: string): Promise<StoredDocument | null> {
		const query = this.db.query(
			"SELECT * FROM ship_documents WHERE slug = ? AND id = ?",
		);
		const row = query.get(slug, id) as {
			id: string;
			data: string;
		} | null;
		if (!row) return null;
		return { id: row.id, ...JSON.parse(row.data) };
	}

	async create(
		slug: string,
		body: Record<string, unknown>,
	): Promise<StoredDocument> {
		const id = this.nextId(slug);
		const ts = new Date().toISOString();

		this.db.run(
			"INSERT INTO ship_documents (id, slug, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
			[id, slug, JSON.stringify(body), ts, ts],
		);

		return { id, ...body };
	}

	async update(
		slug: string,
		id: string,
		body: Record<string, unknown>,
	): Promise<StoredDocument | null> {
		const query = this.db.query(
			"SELECT * FROM ship_documents WHERE slug = ? AND id = ?",
		);
		const row = query.get(slug, id) as {
			id: string;
			data: string;
		} | null;
		if (!row) return null;

		const existingData = JSON.parse(row.data) as Record<string, unknown>;
		const mergedData = { ...existingData, ...body };
		const ts = new Date().toISOString();

		this.db.run(
			"UPDATE ship_documents SET data = ?, updated_at = ? WHERE slug = ? AND id = ?",
			[JSON.stringify(mergedData), ts, slug, id],
		);

		return { id, ...mergedData };
	}

	async delete(slug: string, id: string): Promise<boolean> {
		const result = this.db.run(
			"DELETE FROM ship_documents WHERE slug = ? AND id = ?",
			[slug, id],
		);
		return result.changes > 0;
	}
}
