import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { eq, and } from "drizzle-orm";
import type { Store, StoredDocument } from "ship";

const documents = sqliteTable("ship_documents", {
	id: text("id").primaryKey(),
	slug: text("slug").notNull(),
	data: text("data").notNull(),
	createdAt: text("created_at").notNull(),
	updatedAt: text("updated_at").notNull(),
});

const sequences = sqliteTable("ship_sequences", {
	slug: text("slug").primaryKey(),
	value: integer("value").notNull().default(0),
});

interface DocumentRow {
	id: string;
	slug: string;
	data: string;
	createdAt: string;
	updatedAt: string;
}

interface SequenceRow {
	slug: string;
	value: number;
}

function now(): string {
	return new Date().toISOString();
}

export interface DrizzleAdapterConfig {
	url?: string;
}

export class DrizzleAdapter implements Store {
	private db: ReturnType<typeof drizzle>;
	private sqlite: Database;

	constructor(config: DrizzleAdapterConfig = {}) {
		this.sqlite = new Database(config.url ?? "ship.db");
		this.sqlite.exec("PRAGMA journal_mode=WAL");
		this.db = drizzle(this.sqlite);

		this.sqlite.exec(`
			CREATE TABLE IF NOT EXISTS ship_documents (
				id TEXT PRIMARY KEY,
				slug TEXT NOT NULL,
				data TEXT NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			)
		`);
		this.sqlite.exec(
			"CREATE INDEX IF NOT EXISTS idx_ship_documents_slug ON ship_documents(slug)",
		);
		this.sqlite.exec(`
			CREATE TABLE IF NOT EXISTS ship_sequences (
				slug TEXT PRIMARY KEY,
				value INTEGER NOT NULL DEFAULT 0
			)
		`);
	}

	private nextId(slug: string): string {
		const row = this.db
			.select()
			.from(sequences)
			.where(eq(sequences.slug, slug))
			.get() as SequenceRow | undefined;

		if (row) {
			const newVal = row.value + 1;
			this.db
				.update(sequences)
				.set({ value: newVal })
				.where(eq(sequences.slug, slug))
				.run();
			return String(newVal);
		}

		this.db.insert(sequences).values({ slug, value: 1 }).run();
		return "1";
	}

	async list(
		slug: string,
	): Promise<{ data: StoredDocument[]; total: number }> {
		const rows = this.db
			.select()
			.from(documents)
			.where(eq(documents.slug, slug))
			.all() as DocumentRow[];

		const data = rows.map((r) => ({ id: r.id, ...JSON.parse(r.data) }));
		return { data, total: data.length };
	}

	async get(slug: string, id: string): Promise<StoredDocument | null> {
		const rows = this.db
			.select()
			.from(documents)
			.where(and(eq(documents.slug, slug), eq(documents.id, id)))
			.all() as DocumentRow[];

		const row = rows[0];
		if (!row) return null;
		return { id: row.id, ...JSON.parse(row.data) };
	}

	async create(
		slug: string,
		body: Record<string, unknown>,
	): Promise<StoredDocument> {
		const id = this.nextId(slug);
		const ts = now();
		const doc: StoredDocument = { id, ...body };

		this.db
			.insert(documents)
			.values({
				id,
				slug,
				data: JSON.stringify(body),
				createdAt: ts,
				updatedAt: ts,
			})
			.run();

		return doc;
	}

	async update(
		slug: string,
		id: string,
		body: Record<string, unknown>,
	): Promise<StoredDocument | null> {
		const rows = this.db
			.select()
			.from(documents)
			.where(and(eq(documents.slug, slug), eq(documents.id, id)))
			.all() as DocumentRow[];

		const row = rows[0];
		if (!row) return null;

		const existingData = JSON.parse(row.data) as Record<string, unknown>;
		const mergedData = { ...existingData, ...body };
		const ts = now();

		this.db
			.update(documents)
			.set({ data: JSON.stringify(mergedData), updatedAt: ts })
			.where(and(eq(documents.slug, slug), eq(documents.id, id)))
			.run();

		return { id, ...mergedData };
	}

	async delete(slug: string, id: string): Promise<boolean> {
		const rows = this.db
			.select()
			.from(documents)
			.where(and(eq(documents.slug, slug), eq(documents.id, id)))
			.all() as DocumentRow[];

		if (!rows[0]) return false;

		this.db
			.delete(documents)
			.where(and(eq(documents.slug, slug), eq(documents.id, id)))
			.run();

		return true;
	}
}
