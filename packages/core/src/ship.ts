import type { ShipConfig as ShipConfigType } from "./types";
import { MemoryAdapter } from "./store/memory";
import type { Store } from "./store/types";
import { createHandler } from "./server/handler";

export interface ShipInstance {
	sail(cb?: (url: string) => void): void;
	stop(): void;
}

function validateRelations(config: ShipConfigType): void {
	const slugs = new Set(config.collections.map((c) => c.slug));
	for (const col of config.collections) {
		for (const field of col.fields) {
			if (
				field.type === "relation" &&
				field.relationTo &&
				!slugs.has(field.relationTo)
			) {
				throw new Error(
					`Collection "${col.slug}" has relation field "${field.name}" referencing unknown collection "${field.relationTo}"`,
				);
			}
		}
	}
}

export function Ship(config: ShipConfigType): ShipInstance {
	validateRelations(config);

	const store: Store = config.database ?? new MemoryAdapter();
	const fetch = createHandler(config, store);

	let server: ReturnType<typeof Bun.serve> | null = null;

	return {
		sail(cb?: (url: string) => void): void {
			server = Bun.serve({
				port: config.http?.port ?? 8080,
				fetch,
			});
			if (cb) cb(server.url.href);
			else console.log(`Ship sailing on ${server.url}`);
		},

		stop(): void {
			server?.stop();
		},
	};
}
