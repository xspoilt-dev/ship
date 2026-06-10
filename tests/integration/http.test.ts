import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Ship } from "ship";
import type { ShipConfig, CollectionConfig } from "ship";

const POSTS: CollectionConfig = {
	slug: "posts",
	access: { read: () => true, create: () => true, update: () => true, delete: () => true },
	fields: [
		{ name: "title", type: "text", required: true },
		{ name: "body", type: "text", required: false },
	],
};

const AUTHORS: CollectionConfig = {
	slug: "authors",
	access: { read: () => true, create: () => true, update: () => true, delete: () => true },
	fields: [
		{ name: "name", type: "text", required: true },
	],
};

describe("HTTP integration", () => {
	let ship: ReturnType<typeof Ship>;
	let base: string;

	beforeAll(() => {
		ship = Ship({
			collections: [POSTS, AUTHORS],
			http: { port: 0 },
		} as ShipConfig);

		ship.sail((url) => {
			base = `${url}api`;
		});
	});

	afterAll(() => {
		ship.stop();
	});

	it("GET /api/posts returns empty list", async () => {
		const res = await fetch(`${base}/posts`);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ data: [], total: 0 });
	});

	it("GET /api/nonexistent returns 404", async () => {
		const res = await fetch(`${base}/nonexistent`);
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error.message).toContain("nonexistent");
	});

	it("POST /api/posts creates a document", async () => {
		const res = await fetch(`${base}/posts`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Hello World", body: "First post" }),
		});
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.data.title).toBe("Hello World");
		expect(body.data.body).toBe("First post");
		expect(body.data.id).toBeDefined();
	});

	it("POST /api/posts with missing required field returns 400", async () => {
		const res = await fetch(`${base}/posts`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ body: "no title" }),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.message).toBe("Validation failed");
		expect(body.error.details).toContain("title is required");
	});

	it("POST /api/posts with invalid JSON returns 400", async () => {
		const res = await fetch(`${base}/posts`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "not-json",
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error.message).toBe("Invalid JSON in request body");
	});

	it("GET /api/posts/:id returns single document", async () => {
		const createRes = await fetch(`${base}/posts`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Specific Post" }),
		});
		const created = await createRes.json();
		const id = created.data.id;

		const getRes = await fetch(`${base}/posts/${id}`);
		expect(getRes.status).toBe(200);
		const body = await getRes.json();
		expect(body.data.title).toBe("Specific Post");
		expect(body.data.id).toBe(id);
	});

	it("GET /api/posts/:id returns 404 for unknown id", async () => {
		const res = await fetch(`${base}/posts/999`);
		expect(res.status).toBe(404);
	});

	it("PUT /api/posts/:id updates a document", async () => {
		const createRes = await fetch(`${base}/posts`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Original", body: "original body" }),
		});
		const created = await createRes.json();
		const id = created.data.id;

		const updateRes = await fetch(`${base}/posts/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Updated" }),
		});
		expect(updateRes.status).toBe(200);
		const body = await updateRes.json();
		expect(body.data.title).toBe("Updated");
		expect(body.data.body).toBe("original body");
		expect(body.data.id).toBe(id);
	});

	it("PUT without id returns 400", async () => {
		const res = await fetch(`${base}/posts`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Nope" }),
		});
		expect(res.status).toBe(400);
	});

	it("PUT /api/posts/:id with invalid body returns 400", async () => {
		const createRes = await fetch(`${base}/posts`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Test" }),
		});
		const created = await createRes.json();

		const res = await fetch(`${base}/posts/${created.data.id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: null }),
		});
		expect(res.status).toBe(400);
	});

	it("DELETE /api/posts/:id deletes a document", async () => {
		const createRes = await fetch(`${base}/posts`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Delete me" }),
		});
		const created = await createRes.json();
		const id = created.data.id;

		const delRes = await fetch(`${base}/posts/${id}`, { method: "DELETE" });
		expect(delRes.status).toBe(200);
		const body = await delRes.json();
		expect(body.success).toBe(true);

		const getRes = await fetch(`${base}/posts/${id}`);
		expect(getRes.status).toBe(404);
	});

	it("DELETE without id returns 400", async () => {
		const res = await fetch(`${base}/posts`, { method: "DELETE" });
		expect(res.status).toBe(400);
	});

	it("DELETE /api/posts/:id returns 404 for unknown id", async () => {
		const res = await fetch(`${base}/posts/999`, { method: "DELETE" });
		expect(res.status).toBe(404);
	});

	it("OPTIONS request returns 405", async () => {
		const res = await fetch(`${base}/posts`, { method: "OPTIONS" });
		expect(res.status).toBe(405);
	});

	it("non-API route returns 404", async () => {
		const res = await fetch(`${base.replace("/api", "")}/notapi`);
		expect(res.status).toBe(404);
	});
});

describe("HTTP integration with access control", () => {
	let ship: ReturnType<typeof Ship>;
	let base: string;

	beforeAll(() => {
		let readAllowed = false;
		ship = Ship({
			collections: [
				{
					slug: "secrets",
					access: {
						read: () => readAllowed,
						create: () => false,
						update: () => false,
						delete: () => false,
					},
					fields: [{ name: "name", type: "text", required: true }],
				},
			],
			http: { port: 0 },
		} as ShipConfig);

		ship.sail((url) => {
			base = `${url}api`;
		});
	});

	afterAll(() => {
		ship.stop();
	});

	it("returns 403 when create access is denied", async () => {
		const res = await fetch(`${base}/secrets`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "classified" }),
		});
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error.message).toContain("Access denied");
	});
});
