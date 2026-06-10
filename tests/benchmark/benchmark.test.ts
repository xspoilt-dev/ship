import { describe, it, expect } from "bun:test";
import { MemoryStore } from "../../src/store/memory";
import { validateBody } from "../../src/schema/validation";
import type { Field } from "../../src/types";

const POST_FIELDS: Field[] = [
	{ name: "title", type: "text", required: true, validation: { minLength: 1, maxLength: 100 } },
	{ name: "body", type: "text", required: false },
	{ name: "author", type: "relation", required: true, relationTo: { slug: "authors" } },
];

function elapsedMs(start: bigint): number {
	return Number(Bun.nanoseconds() - start) / 1e6;
}

describe("benchmark", () => {
	it("MemoryStore#create (1000 docs)", () => {
		const start = Bun.nanoseconds();
		const store = new MemoryStore();
		for (let i = 0; i < 1000; i++) {
			store.create("posts", { title: `Post ${i}`, body: "content", author: "1" });
		}
		const ms = elapsedMs(start);
		console.log(`  MemoryStore#create 1000 docs: ${ms.toFixed(2)}ms`);
	});

	it("MemoryStore#list (100 docs, 100 iterations)", () => {
		const store = new MemoryStore();
		for (let i = 0; i < 100; i++) {
			store.create("posts", { title: `Post ${i}`, body: "content" });
		}
		const start = Bun.nanoseconds();
		for (let i = 0; i < 100; i++) {
			store.list("posts");
		}
		const ms = elapsedMs(start);
		console.log(`  MemoryStore#list 100x100: ${ms.toFixed(2)}ms`);
	});

	it("MemoryStore#get by id (100 docs)", () => {
		const store = new MemoryStore();
		const ids: string[] = [];
		for (let i = 0; i < 100; i++) {
			const doc = store.create("posts", { title: `Post ${i}` });
			ids.push(doc.id);
		}
		const start = Bun.nanoseconds();
		for (const id of ids) {
			store.get("posts", id);
		}
		const ms = elapsedMs(start);
		console.log(`  MemoryStore#get 100 docs: ${ms.toFixed(2)}ms`);
	});

	it("validateBody - valid payload", () => {
		const body = { title: "Hello World", body: "Some content", author: "abc123" };
		const start = Bun.nanoseconds();
		for (let i = 0; i < 10000; i++) {
			validateBody(POST_FIELDS, body);
		}
		const ms = elapsedMs(start);
		console.log(`  validateBody valid x10000: ${ms.toFixed(2)}ms`);
	});

	it("validateBody - invalid payload", () => {
		const body = { title: "", body: null, author: 42 };
		const start = Bun.nanoseconds();
		for (let i = 0; i < 10000; i++) {
			validateBody(POST_FIELDS, body);
		}
		const ms = elapsedMs(start);
		console.log(`  validateBody invalid x10000: ${ms.toFixed(2)}ms`);
	});

	it("JSON serialization roundtrip", () => {
		const doc = { id: "1", title: "Test", body: "Content", author: "2" };
		const start = Bun.nanoseconds();
		for (let i = 0; i < 100000; i++) {
			const json = JSON.stringify(doc);
			const parsed = JSON.parse(json);
			expect(parsed.title).toBe("Test");
		}
		const ms = elapsedMs(start);
		console.log(`  JSON roundtrip x100000: ${ms.toFixed(2)}ms`);
	});
});
