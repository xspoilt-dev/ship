export const Books = {
	slug: "books",
	access: {
		read: () => true,
		create: () => true,
		update: () => true,
		delete: () => true,
	},
	fields: [
		{
			name: "title",
			type: "text",
			required: true,
			validation: {
				minLength: 1,
				maxLength: 255,
			},
		},
		{
			name: "author",
			type: "relation",
			relationTo: "users",
			required: true,
		},
	],
};
