export class HttpError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly details?: string[],
	) {
		super(message);
		this.name = "HttpError";
	}

	toResponse(): Response {
		const body: Record<string, unknown> = {
			error: { message: this.message },
		};
		if (this.details?.length) {
			(body.error as Record<string, unknown>).details = this.details;
		}
		return Response.json(body, { status: this.status });
	}
}

export class NotFoundError extends HttpError {
	constructor(slug: string, id?: string) {
		const msg = id
			? `Document '${id}' not found in '${slug}'`
			: `Collection '${slug}' not found`;
		super(msg, 404);
	}
}

export class ValidationError extends HttpError {
	constructor(details: string[]) {
		super("Validation failed", 400, details);
	}
}

export class AccessDeniedError extends HttpError {
	constructor(action: string) {
		super(`Access denied for '${action}'`, 403);
	}
}

export class AuthenticationError extends HttpError {
	constructor() {
		super("Invalid email or password", 401);
	}
}

export function errorToResponse(error: unknown): Response {
	if (error instanceof HttpError) {
		return error.toResponse();
	}
	if (error instanceof SyntaxError) {
		return Response.json(
			{ error: { message: "Invalid JSON in request body" } },
			{ status: 400 },
		);
	}
	console.error("Unhandled error:", error);
	return Response.json(
		{ error: { message: "Internal server error" } },
		{ status: 500 },
	);
}
