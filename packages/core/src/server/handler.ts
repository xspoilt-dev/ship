import type { ShipConfig, CollectionConfig, Access } from "../types";
import type { Store } from "../store/types";
import { validateBody } from "../schema/validation";
import {
	NotFoundError,
	ValidationError,
	AccessDeniedError,
	errorToResponse,
} from "../errors";

function checkAccess(collection: CollectionConfig, action: keyof Access): void {
	if (!collection.access[action]()) {
		throw new AccessDeniedError(action);
	}
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export function createHandler(config: ShipConfig, store: Store) {
	const collectionMap = new Map<string, CollectionConfig>();
	for (const col of config.collections) {
		collectionMap.set(col.slug, col);
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

			const method = req.method;

			if (method === "GET") {
				checkAccess(collection, "read");
				if (id) {
					const doc = await store.get(slug, id);
					if (!doc) throw new NotFoundError(slug, id);
					return Response.json({ data: doc });
				}
				const result = await store.list(slug);
				return Response.json(result);
			}

			if (method === "POST") {
				checkAccess(collection, "create");
				const body = (await req.json()) as Record<string, unknown>;
				const errors = validateBody(collection.fields, body);
				if (errors.length > 0) throw new ValidationError(errors);
				const doc = await store.create(slug, body);
				return Response.json({ data: doc }, { status: 201 });
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
				checkAccess(collection, "update");
				const body = (await req.json()) as Record<string, unknown>;
				const errors = validateBody(collection.fields, body);
				if (errors.length > 0) throw new ValidationError(errors);
				const doc = await store.update(slug, id, body);
				if (!doc) throw new NotFoundError(slug, id);
				return Response.json({ data: doc });
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
				checkAccess(collection, "delete");
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
