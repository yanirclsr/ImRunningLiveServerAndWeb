// test route
import express from "express";
import { getDb } from "./db.js";
const app = express();

app.get("/test-db", async (_req, res) => {
    const db = await getDb();
    const r = await db.collection("healthchecks").insertOne({ at: new Date() });
    res.json({ ok: true, id: r.insertedId });
});

app.listen(process.env.PORT || 3000);
