import type {
	ShipConfig,
	CollectionConfig,
	Access,
	RequestContext,
	Field,
} from "../types";
import type { Store, StoredDocument } from "../store/types";
import { validateBody } from "../schema/validation";
import {
	NotFoundError,
	ValidationError,
	AccessDeniedError,
	AuthenticationError,
	errorToResponse,
} from "../errors";

const JSON_HEADERS = { "Content-Type": "application/json" };

function checkAccess(
	collection: CollectionConfig,
	action: keyof Access,
	ctx: RequestContext,
	doc?: Record<string, unknown>,
): void {
	if (!collection.access[action](ctx, doc)) {
		throw new AccessDeniedError(action);
	}
}

function stripHiddenFields(
	doc: Record<string, unknown>,
	fields: Field[],
): Record<string, unknown> {
	const hiddenNames = new Set(
		fields.filter((f) => f.hidden).map((f) => f.name),
	);
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(doc)) {
		if (!hiddenNames.has(key)) {
			result[key] = value;
		}
	}
	return result;
}

export function createHandler(config: ShipConfig, store: Store) {
	const collectionMap = new Map<string, CollectionConfig>();
	const authCollections = new Map<string, NonNullable<CollectionConfig["auth"]>>();
	const sessions = new Map<string, string>();

	for (const col of config.collections) {
		collectionMap.set(col.slug, col);
		if (col.auth) {
			authCollections.set(col.slug, col.auth);
		}
	}

	async function resolveUser(
		req: Request,
	): Promise<Record<string, unknown> | null> {
		const auth = req.headers.get("Authorization");
		if (!auth?.startsWith("Bearer ")) return null;
		const token = auth.slice(7);
		const userId = sessions.get(token);
		if (!userId) return null;
		for (const [slug] of authCollections) {
			const user = await store.get(slug, userId);
			if (user) return user;
		}
		return null;
	}

	return async (req: Request): Promise<Response> => {
		try {
			const url = new URL(req.url);
			const segments = url.pathname.split("/").filter(Boolean);

			if (
				segments[0] !== "api" ||
				segments.length < 2 ||
				segments.length > 3
			) {
				return new Response(
					JSON.stringify({ error: { message: "Not found" } }),
					{ status: 404, headers: JSON_HEADERS },
				);
			}

			const slug = segments[1]!;
			const id = segments[2];
			const collection = collectionMap.get(slug);
			if (!collection) {
				throw new NotFoundError(slug);
			}

			const authConfig = authCollections.get(slug);
			const method = req.method;
			const body =
				method === "POST" || method === "PUT"
					? ((await req.json()) as Record<string, unknown>)
					: undefined;

			// --- Auth routes (signup / login) ---
			if (authConfig && id && method === "POST") {
				const emailField = authConfig.fields.email;
				const passwordField = authConfig.fields.password;

				if (id === "signup") {
					const email = body![emailField];
					const password = body![passwordField];
					if (!email || !password) {
						return new Response(
							JSON.stringify({
								error: { message: "Email and password are required" },
							}),
							{ status: 400, headers: JSON_HEADERS },
						);
					}
					const hashed = await Bun.password.hash(
						password as string,
					);
					const doc = await store.create(slug, {
						...body,
						[passwordField]: hashed,
					});
					return Response.json(
						{
							data: stripHiddenFields(doc, collection.fields),
						},
						{ status: 201 },
					);
				}

				if (id === "login") {
					const email = body![emailField] as string | undefined;
					const password = body![passwordField] as
						| string
						| undefined;
					if (!email || !password) {
						return new Response(
							JSON.stringify({
								error: {
									message: "Email and password are required",
								},
							}),
							{ status: 400, headers: JSON_HEADERS },
						);
					}
					const result = await store.list(slug);
					const user = result.data.find(
						(d) => d[emailField] === email,
					);
					if (!user) {
						throw new AuthenticationError();
					}
					const valid = await Bun.password.verify(
						password,
						user[passwordField] as string,
					);
					if (!valid) {
						throw new AuthenticationError();
					}
					const token = crypto.randomUUID();
					sessions.set(token, user.id);
					return Response.json({
						token,
						user: stripHiddenFields(user, collection.fields),
					});
				}

				// Unknown auth action
				return new Response(
					JSON.stringify({ error: { message: "Not found" } }),
					{ status: 404, headers: JSON_HEADERS },
				);
			}

			// --- Authenticate user for CRUD ---
			const user = await resolveUser(req);
			const ctx: RequestContext = { user };

			// --- CRUD routes ---
			if (method === "GET") {
				if (id) {
					const doc = await store.get(slug, id);
					if (!doc) throw new NotFoundError(slug, id);
					checkAccess(collection, "read", ctx, doc);
					return Response.json({
						data: stripHiddenFields(doc, collection.fields),
					});
				}
				checkAccess(collection, "read", ctx);
				const result = await store.list(slug);
				return Response.json({
					data: result.data.map((d) =>
						stripHiddenFields(d, collection.fields),
					),
					total: result.total,
				});
			}

			if (method === "POST") {
				checkAccess(collection, "create", ctx);
				const errors = validateBody(collection.fields, body!);
				if (errors.length > 0) throw new ValidationError(errors);

				// Hash encrypted fields before storing
				let processedBody = body!;
				for (const field of collection.fields) {
					if (
						field.encrypted &&
						processedBody[field.name] != null
					) {
						processedBody = {
							...processedBody,
							[field.name]: await Bun.password.hash(
								String(processedBody[field.name]),
							),
						};
					}
				}

				const doc = await store.create(slug, processedBody);
				return Response.json(
					{
						data: stripHiddenFields(doc, collection.fields),
					},
					{ status: 201 },
				);
			}

			if (method === "PUT") {
				if (!id) {
					return new Response(
						JSON.stringify({
							error: { message: "ID is required for update" },
						}),
						{ status: 400, headers: JSON_HEADERS },
					);
				}
				const existing = await store.get(slug, id);
				if (!existing) throw new NotFoundError(slug, id);
				checkAccess(collection, "update", ctx, existing);
				const errors = validateBody(collection.fields, body!);
				if (errors.length > 0) throw new ValidationError(errors);

				// Hash encrypted fields before updating
				let processedBody = body!;
				for (const field of collection.fields) {
					if (
						field.encrypted &&
						processedBody[field.name] != null
					) {
						processedBody = {
							...processedBody,
							[field.name]: await Bun.password.hash(
								String(processedBody[field.name]),
							),
						};
					}
				}

				const doc = await store.update(slug, id, processedBody);
				return Response.json({
					data: stripHiddenFields(doc!, collection.fields),
				});
			}

			if (method === "DELETE") {
				if (!id) {
					return new Response(
						JSON.stringify({
							error: { message: "ID is required for delete" },
						}),
						{ status: 400, headers: JSON_HEADERS },
					);
				}
				const existing = await store.get(slug, id);
				if (!existing) throw new NotFoundError(slug, id);
				checkAccess(collection, "delete", ctx, existing);
				const deleted = await store.delete(slug, id);
				if (!deleted) throw new NotFoundError(slug, id);
				return Response.json({ success: true });
			}

			return new Response(
				JSON.stringify({ error: { message: "Method not allowed" } }),
				{ status: 405, headers: JSON_HEADERS },
			);
		} catch (error) {
			return errorToResponse(error);
		}
	};
}
