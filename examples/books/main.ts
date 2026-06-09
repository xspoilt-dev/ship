import { Ship } from "ship";
import { Authors } from "./collections/Authors";
import { Books } from "./collections/Books";

const ship = Ship({
	http: {
		port: 8080,
		cors: ["http://localhost:3000"],
	},
	database: {
		adapter: "memory",
	},
	collections: [Authors, Books],
});

ship.sail();
