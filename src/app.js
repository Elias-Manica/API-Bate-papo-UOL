import express from "express";
import cors from "cors";
import joi from "joi";
import dayjs from "dayjs";

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
  name: joi
    .string()
    .required()
    .regex(/[a-zA-Z0-9]/)
    .alphanum(),
});

const messageSchema = joi.object({
  to: joi
    .string()
    .required()
    .empty("")
    .regex(/[a-zA-Z0-9]/),
  text: joi
    .string()
    .required()
    .empty("")
    .regex(/[a-zA-Z0-9]/),
  type: joi
    .string()
    .required()
    .empty("")
    .regex(/[a-zA-Z0-9]/),
});

async function removeInative() {
  try {
    const listUsers = await db.collection("participantsUOL").find().toArray();
    listUsers.forEach((value) => {
      // if (Date.now() - value.lastStatus > 10) {
      //   console.log(value.name, "está inativo há", Date.now() - value.lastStatus);
      // }
      console.log(value);
    });
  } catch (error) {
    console.log(error);
  }
}

app.post("/participants", async (req, res) => {
  const { name } = req.body;
  const validation = nameSchema.validate(req.body, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    res.status(422).send(errors);
    return;
  }

  const body = { name: name, lastStatus: Date.now() };
  const bodyMessage = {
    from: name,
    to: "Todos",
    text: "entra na sala...",
    type: "status",
    time: `${dayjs(Date.now()).format("HH:mm:ss")}`,
  };
  try {
    const listUsers = await db.collection("participantsUOL").find().toArray();
    let findName = false;
    listUsers.forEach((value) => {
      if (value.name === name) {
        findName = true;
      }
    });
    if (findName) {
      res.sendStatus(409);
      return;
    } else {
      const response = await db.collection("participantsUOL").insertOne(body);
      const responseMessage = await db
        .collection("messagesUOL")
        .insertOne(bodyMessage);
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

//LEMBRAR DE TRANSFORMAR OS CARACTERES ESPECIAIS DO USER EM STR

app.post("/messages", async (req, res) => {
  const User = req.headers;
  console.log(User.user);

  if (!User.user) {
    res.status(422).send({ error: "Header necessário" });
    return;
  }

  const validation = messageSchema.validate(req.body, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    res.status(422).send(errors);
    return;
  }

  try {
    const listUsers = await db.collection("participantsUOL").find().toArray();
    let findName = false;
    listUsers.forEach((value) => {
      if (value.name === User.user) {
        findName = true;
      }
    });
    if (findName) {
      const body = {
        from: `${User.user}`,
        to: `${req.body.to}`,
        text: `${req.body.text}`,
        type: `${req.body.type}`,
        time: `${dayjs(Date.now()).format("HH:mm:ss")}`,
      };
      const response = await db.collection("messagesUOL").insertOne(body);
      res.sendStatus(201);
      return;
    } else {
      res.status(409).send({ error: "Usuário não logado" });
    }
  } catch (error) {
    res.sendStatus(500);
  }
});

app.get("/messages", async (req, res) => {
  const User = req.headers;
  const { limit } = req.query;

  if (!User.user) {
    res.status(422).send({ error: "Header necessário" });
    return;
  }
  try {
    const listUsers = await db.collection("participantsUOL").find().toArray();
    let findName = false;
    listUsers.forEach((value) => {
      if (value.name === User.user) {
        findName = true;
      }
    });
    if (findName) {
      const response = await db.collection("messagesUOL").find().toArray();
      let responseFilter = response.filter((value) => {
        if (
          value.to === "Todos" ||
          value.from === User.user ||
          value.to === User.user
        ) {
          return value;
        }
        return false;
      });
      if (!limit) {
        res.send(responseFilter.reverse());
        return;
      } else {
        res.send(responseFilter.reverse().splice(0, limit));
        return;
      }
    } else {
      res.status(409).send({ error: "Usuário não logado" });
    }
  } catch (error) {
    res.sendStatus(500);
  }
});

app.post("/status", async (req, res) => {
  const User = req.headers;
  const nameUser = User.user;

  if (!nameUser) {
    res.status(422).send({ error: "Header necessário" });
    return;
  }
  try {
    const listUsers = await db.collection("participantsUOL").find().toArray();
    let findName = false;
    let userDataId = "";
    listUsers.forEach((value) => {
      if (value.name === nameUser) {
        findName = true;
        userDataId = value._id;
      }
    });
    if (findName) {
      const response = await db
        .collection("participantsUOL")
        .updateOne({ _id: userDataId }, { $set: { lastStatus: Date.now() } });
      res.sendStatus(200);
      return;
    } else {
      res.sendStatus(404);
      return;
    }
  } catch (error) {
    res.sendStatus(500);
    return;
  }
});

setInterval(async () => {
  try {
    const listUsers = await db.collection("participantsUOL").find().toArray();
    listUsers.forEach((value) => {
      if (Date.now() - value.lastStatus > 10000) {
        const response = db
          .collection("participantsUOL")
          .deleteOne({ _id: value._id });
        const bodyMessage = {
          from: value.name,
          to: "Todos",
          text: "sai da sala...",
          type: "status",
          time: `${dayjs(Date.now()).format("HH:mm:ss")}`,
        };
        const responseMessage = db
          .collection("messagesUOL")
          .insertOne(bodyMessage);
        console.log(value.name, "excluido");
      }
    });
  } catch (error) {
    console.log(error);
  }
}, 15000);

app.listen(5000, () => {
  console.log("Server is listening on port 5000");
});
