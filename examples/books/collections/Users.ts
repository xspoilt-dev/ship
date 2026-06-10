function selfOrAdmin(ctx, record) {
	// Allow users to read their own record, or allow admins to read any record
	return ctx.user?.id === record.id || ctx.user?.role === "admin";
}

export const Users = {
	slug: "users",
	access: {
		read: selfOrAdmin,
		create: () => true,
		update: selfOrAdmin,
		delete: selfOrAdmin,
	},
	auth: {
		type: "email",
		fields: { email: "email", password: "password" },
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
		{
			name: "role",
			type: "select",
			options: [
				{
					label: "Admin",
					value: "admin",
				},
				{
					label: "Editor",
					value: "editor",
				},
				{
					label: "Viewer",
					value: "viewer",
				},
			],
			required: true,
			hasMany: false,
			defaultValue: ["viewer"],
			index: true,
		},
		{
			name: "email",
			type: "text",
			required: true,
			validation: {
				pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
			},
			unique: true,
			index: true,
		},
		{
			name: "password",
			type: "text",
			required: true,
			validation: {
				minLength: 8,
			},
			hidden: true,
			encrypted: true,
		}
	],
};
