import { describe, it, expect } from "bun:test";
import { Ship } from "../src/ship";
import type { ShipConfig } from "../src/types";

function makeConfig(overrides: Partial<ShipConfig> = {}): ShipConfig {
	return {
		collections: [
			{
				slug: "posts",
				access: { read: () => true, create: () => true, update: () => true, delete: () => true },
				fields: [{ name: "title", type: "text", required: true }],
			},
		],
		http: { port: 0 },
		...overrides,
	};
}

describe("Ship", () => {
	it("creates a ship instance with sail and stop methods", () => {
		const ship = Ship(makeConfig());
		expect(ship).toHaveProperty("sail");
		expect(ship).toHaveProperty("stop");
		expect(typeof ship.sail).toBe("function");
		expect(typeof ship.stop).toBe("function");
	});

	it("throws on invalid relation reference", () => {
		const config = makeConfig({
			collections: [
				{
					slug: "posts",
					access: { read: () => true, create: () => true, update: () => true, delete: () => true },
					fields: [
						{
							name: "author",
							type: "relation",
							required: true,
							relationTo: { slug: "nonexistent" },
						},
					],
				},
			],
		});
		expect(() => Ship(config)).toThrow(
			'Collection "posts" has relation field "author" referencing unknown collection "nonexistent"',
		);
	});

	it("sail and stop work without error", () => {
		const ship = Ship(makeConfig());
		expect(() => {
			ship.sail();
			ship.stop();
		}).not.toThrow();
	});

	it("sail invokes callback with server URL when provided", () => {
		let url = "";
		const ship = Ship(makeConfig());
		ship.sail((u) => {
			url = u;
		});
		ship.stop();
		expect(url).toMatch(/^http:\/\/localhost:\d+\/$/);
	});
});
