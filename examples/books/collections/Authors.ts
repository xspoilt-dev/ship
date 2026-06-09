export const Authors = {
	slug: "authors",
	access: {
		read: () => true,
		create: () => true,
		update: () => true,
		delete: () => true,
	},
	fields: [
		{
			name: "name",
			type: "text",
			required: true,
			validation: {
				minLength: 1,
				maxLength: 255,
			},
		},
	],
};
