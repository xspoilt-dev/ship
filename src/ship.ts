import type { ShipConfig as ShipConfigType } from "./types";
import { MemoryStore } from "./store/memory";
import { DrizzleStore } from "./store/drizzle";
import type { Store } from "./store/types";
import { createHandler } from "./server/handler";

export interface ShipInstance {
	sail(): void;
	stop(): void;
}

function createStore(config: ShipConfigType): Store {
	const adapter = config.database?.adapter ?? "memory";
	switch (adapter) {
		case "memory":
			return new MemoryStore();
		case "sqlite":
			return new DrizzleStore({ url: config.database?.url });
		default: {
			console.warn(
				`Adapter '${adapter}' not implemented, falling back to memory`,
			);
			return new MemoryStore();
		}
	}
}

function validateRelations(config: ShipConfigType): void {
	const slugs = new Set(config.collections.map((c) => c.slug));
	for (const col of config.collections) {
		for (const field of col.fields) {
			if (
				field.type === "relation" &&
				field.relationTo &&
				!slugs.has(field.relationTo.slug)
			) {
				throw new Error(
					`Collection "${col.slug}" has relation field "${field.name}" referencing unknown collection "${field.relationTo.slug}"`,
				);
			}
		}
	}
}

export function Ship(config: ShipConfigType): ShipInstance {
	validateRelations(config);

	const store = createStore(config);
	const fetch = createHandler(config, store);

	let server: ReturnType<typeof Bun.serve> | null = null;

	return {
		sail(cb?: () => void): void {
			server = Bun.serve({
				port: config.http?.port ?? 8080,
				fetch,
			});
			if (cb) cb();
			else console.log(`Ship sailing on ${server.url}`);
		},

		stop(): void {
			server?.stop();
		},
	};
}
