import { describe, it, expect } from "bun:test";
import { defineCollection } from "../src/collection";

describe("defineCollection", () => {
	it("returns the config object as-is", () => {
		const config = {
			slug: "posts",
			access: { read: () => true, create: () => true, update: () => true, delete: () => true },
			fields: [{ name: "title", type: "text" as const, required: true }],
		};
		const result = defineCollection(config);
		expect(result).toBe(config);
		expect(result.slug).toBe("posts");
	});

	it("preserves field types inference", () => {
		const config = defineCollection({
			slug: "authors",
			access: { read: () => false, create: () => false, update: () => false, delete: () => false },
			fields: [
				{ name: "name", type: "text" as const, required: true },
				{ name: "bio", type: "text" as const, required: false },
			],
		});
		expect(config.fields).toHaveLength(2);
		expect(config.fields[0]!.name).toBe("name");
		expect(config.fields[1]!.name).toBe("bio");
	});
});
