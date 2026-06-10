import { describe, it, expect, beforeEach } from "bun:test";
import { DrizzleAdapter } from "../src";

describe("DrizzleAdapter", () => {
	let store: DrizzleAdapter;

	beforeEach(() => {
		store = new DrizzleAdapter({ url: ":memory:" });
	});

	describe("list", () => {
		it("returns empty list for new collection", async () => {
			const result = await store.list("posts");
			expect(result.data).toEqual([]);
			expect(result.total).toBe(0);
		});

		it("returns all documents in collection", async () => {
			await store.create("posts", { title: "A" });
			await store.create("posts", { title: "B" });
			const result = await store.list("posts");
			expect(result.total).toBe(2);
			expect(result.data).toHaveLength(2);
		});
	});

	describe("get", () => {
		it("returns null for non-existent document", async () => {
			const doc = await store.get("posts", "999");
			expect(doc).toBeNull();
		});

		it("returns document by id", async () => {
			const created = await store.create("posts", { title: "Hello" });
			const doc = await store.get("posts", created.id);
			expect(doc).not.toBeNull();
			expect(doc!.title).toBe("Hello");
		});
	});

	describe("create", () => {
		it("creates document with auto-generated id", async () => {
			const doc = await store.create("posts", { title: "New Post" });
			expect(doc.id).toBe("1");
			expect(doc.title).toBe("New Post");
		});
	});

	describe("update", () => {
		it("returns null for non-existent document", async () => {
			const doc = await store.update("posts", "999", { title: "Nope" });
			expect(doc).toBeNull();
		});

		it("merges body into existing document", async () => {
			const created = await store.create("posts", { title: "Original", body: "text" });
			const updated = await store.update("posts", created.id, { title: "Updated" });
			expect(updated!.title).toBe("Updated");
			expect(updated!.body).toBe("text");
		});
	});

	describe("delete", () => {
		it("returns false for non-existent document", async () => {
			const result = await store.delete("posts", "999");
			expect(result).toBe(false);
		});

		it("removes document from collection", async () => {
			const created = await store.create("posts", { title: "Delete me" });
			const deleted = await store.delete("posts", created.id);
			expect(deleted).toBe(true);
			const doc = await store.get("posts", created.id);
			expect(doc).toBeNull();
		});
	});
});
