import express from "express";
import cors from "cors";
import joi from "joi";

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

const nameSchema = joi.object({
  name: joi.string().required(),
});

app.post("/participants", async (req, res) => {
  const { name } = req.body;
  const validation = nameSchema.validate(req.body, { abortEarly: false });

  //VALIDAR SE O NOME JÁ TA PRESENTE

  //   let listName = [];

  //   db.collection("participantsUOL")
  //     .find()
  //     .toArray()
  //     .then((value) => {
  //       listName = value;
  //     });

  //   const findName = listName.find((value) => {
  //     value.name === name;
  //   });

  //   if (findName) {
  //     res.sendStatus(409);
  //     return;
  //   }

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    res.status(422).send(errors);
    return;
  }

  const body = { name: name, lastStatus: Date.now() };
  try {
    const listUsers = await db.collection("participantsUOL").find().toArray();
    let findName = false;
    listUsers.forEach((value) => {
      if (value.name === name) {
        findName = true;
      }
    });
    if (findName) {
      console.log("tem repetido");
      res.sendStatus(409);
      return;
    } else {
      const response = await db.collection("participantsUOL").insertOne(body);

      res.sendStatus(201);
      return;
    }
  } catch (error) {
    res.sendStatus(422);
  }
});

app.get("/participants", async (req, res) => {
  try {
    const response = await db.collection("participantsUOL").find().toArray();
    res.send(response);
  } catch (error) {
    res.sendStatus(500);
  }
});

app.post("/messages", async (req, res) => {
  const { name } = req.body;
  const body = { name: name, lastStatus: Date.now() };
  try {
    const response = await db.collection("messagesUOL").insertOne(body);
    res.sendStatus(201);
  } catch (error) {
    res.sendStatus(500);
  }
});

app.get("/messages", async (req, res) => {
  try {
    const response = await db.collection("messagesUOL").find().toArray();
    res.send(response);
  } catch (error) {
    res.sendStatus(500);
  }
});

app.listen(5000, () => {
  console.log("Server is listening on port 5000");
});
