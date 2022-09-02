import express from "express";
import cors from "cors";

import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect().then(() => {
  db = mongoClient.db("batePapoUOL");
});

app.post("/participants", async (req, res) => {
  const { name } = req.body;
  const body = { name: name, lastStatus: Date.now() };
  try {
    const response = await db.collection("participantsUOL").insertOne(body);
    res.sendStatus(201);
  } catch (error) {
    res.sendStatus(422);
  }
});

app.get("/participants", async (req, res) => {
  try {
    const response = await db.collection("participantsUOL").find().toArray();
    res.send(response);
  } catch (error) {
    res.send("erro");
  }
});

app.listen(5000, () => {
  console.log("Server is listening on port 5000");
});
