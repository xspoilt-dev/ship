import { describe, it, expect } from "bun:test";
import {
	HttpError,
	NotFoundError,
	ValidationError,
	AccessDeniedError,
	errorToResponse,
} from "../src/errors";

describe("HttpError", () => {
	it("creates error with message and status", () => {
		const err = new HttpError("Something went wrong", 500);
		expect(err.message).toBe("Something went wrong");
		expect(err.status).toBe(500);
		expect(err.name).toBe("HttpError");
	});

	it("toResponse returns JSON response with correct status", async () => {
		const err = new HttpError("Forbidden", 403);
		const res = err.toResponse();
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body).toEqual({ error: { message: "Forbidden" } });
	});

	it("toResponse includes details when present", async () => {
		const err = new HttpError("Bad request", 400, ["field1 is required", "field2 is invalid"]);
		const res = err.toResponse();
		const body = await res.json();
		expect(body).toEqual({
			error: {
				message: "Bad request",
				details: ["field1 is required", "field2 is invalid"],
			},
		});
	});
});

describe("NotFoundError", () => {
	it("creates 404 for missing collection", () => {
		const err = new NotFoundError("posts");
		expect(err.status).toBe(404);
		expect(err.message).toBe("Collection 'posts' not found");
	});

	it("creates 404 for missing document", () => {
		const err = new NotFoundError("posts", "42");
		expect(err.status).toBe(404);
		expect(err.message).toBe("Document '42' not found in 'posts'");
	});
});

describe("ValidationError", () => {
	it("creates 400 error with details", () => {
		const err = new ValidationError(["title is required", "body too short"]);
		expect(err.status).toBe(400);
		expect(err.message).toBe("Validation failed");
		expect(err.details).toEqual(["title is required", "body too short"]);
	});
});

describe("AccessDeniedError", () => {
	it("creates 403 error with action name", () => {
		const err = new AccessDeniedError("create");
		expect(err.status).toBe(403);
		expect(err.message).toBe("Access denied for 'create'");
	});
});

describe("errorToResponse", () => {
	it("converts HttpError to response", async () => {
		const res = errorToResponse(new HttpError("oops", 400));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toEqual({ error: { message: "oops" } });
	});

	it("converts SyntaxError to 400 response", async () => {
		const res = errorToResponse(new SyntaxError("Unexpected token"));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toEqual({ error: { message: "Invalid JSON in request body" } });
	});

	it("converts unknown errors to 500", async () => {
		const res = errorToResponse(new Error("b0rk"));
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body).toEqual({ error: { message: "Internal server error" } });
	});
});
