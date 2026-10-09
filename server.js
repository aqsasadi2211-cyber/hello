// Local development server. On Vercel, public/ is served statically and api/contact.js runs as a function.
import express from "express";
import contact from "./api/contact.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.all("/api/contact", contact);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Contact form running at http://localhost:${port}`));
