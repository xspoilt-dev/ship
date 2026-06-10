import { SqliteAdapter } from "@ship/sqlite";
import { Users } from "./collections/Users";
import { Books } from "./collections/Books";
import { Posts } from "./collections/Posts";
import type { ShipConfig } from "ship";

const config: ShipConfig = {
	database: new SqliteAdapter({ url: "books.db" }),
	http: {
		port: 8080,
		cors: ["http://localhost:3000"],
	},
	collections: [Users, Books, Posts],
};

export default config;
