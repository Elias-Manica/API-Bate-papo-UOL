import express from "express";
import cors from "cors";
import joi from "joi";
import dayjs from "dayjs";

import { MongoClient, ObjectId } from "mongodb";
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
    .regex(/[a-zA-Z0-9]/),
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
    .regex(/[a-zA-Z0-9]/)
    .valid("message", "private_message"),
});

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
    let findName = await db
      .collection("participantsUOL")
      .findOne({ name: name });
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

app.post("/messages", async (req, res) => {
  const User = req.headers;
  const UserlessCaracter = decodeURIComponent(escape(User.user));
  //TRANSFORMA OS CARACTERES ESPECIAIS DO USER EM STR

  if (!UserlessCaracter) {
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
    let findName = await db
      .collection("participantsUOL")
      .findOne({ name: UserlessCaracter });
    if (findName) {
      const body = {
        from: `${UserlessCaracter}`,
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
  const UserlessCaracter = decodeURIComponent(escape(User.user));

  if (!UserlessCaracter) {
    res.status(422).send({ error: "Header necessário" });
    return;
  }
  try {
    let findName = await db
      .collection("participantsUOL")
      .findOne({ name: UserlessCaracter });
    if (findName) {
      const response = await db.collection("messagesUOL").find().toArray();
      let responseFilter = response.filter((value) => {
        if (
          value.to === "Todos" ||
          value.from === UserlessCaracter ||
          value.to === UserlessCaracter
        ) {
          return value;
        }
        return false;
      });
      if (!limit) {
        res.send(responseFilter);
        return;
      } else {
        res.send(responseFilter.splice(-limit));
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
  const UserlessCaracter = decodeURIComponent(escape(User.user));

  if (!UserlessCaracter) {
    res.status(422).send({ error: "Header necessário" });
    return;
  }
  try {
    const listUsers = await db.collection("participantsUOL").find().toArray();
    let findName = false;
    let userDataId = "";
    listUsers.forEach((value) => {
      if (value.name === UserlessCaracter) {
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

app.delete("/messages/:ID_DA_MENSAGEM", async (req, res) => {
  const User = req.headers;
  const UserlessCaracter = decodeURIComponent(escape(User.user));

  const { ID_DA_MENSAGEM } = req.params;
  const strID = ID_DA_MENSAGEM.toString();

  try {
    let findMessage = await db
      .collection("messagesUOL")
      .findOne({ _id: ObjectId(strID) });
    console.log(findMessage);
    if (findMessage) {
      if (findMessage.from === UserlessCaracter) {
        const response = await db
          .collection("messagesUOL")
          .deleteOne({ _id: ObjectId(strID) });
        res.status(200).send({ message: "mensagem deletada" });
      } else {
        res.sendStatus(401);
      }
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "Id da mensagem inválido" }).status(404);
  }
});

app.put("/messages/:ID_DA_MENSAGEM", async (req, res) => {
  const User = req.headers;
  const UserlessCaracter = decodeURIComponent(escape(User.user));
  //TRANSFORMA OS CARACTERES ESPECIAIS DO USER EM STR

  const { ID_DA_MENSAGEM } = req.params;
  const strID = ID_DA_MENSAGEM.toString();

  if (!UserlessCaracter) {
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
    let findMessage = await db
      .collection("messagesUOL")
      .findOne({ _id: ObjectId(strID) });
    if (findMessage) {
      if (findMessage.from === UserlessCaracter) {
        const response = await db
          .collection("messagesUOL")
          .updateOne({ _id: ObjectId(strID) }, { $set: req.body });
        res.status(200).send({ message: "mensagem modificada" });
      } else {
        res.sendStatus(401);
      }
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "Id da mensagem inválido" }).status(404);
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
      }
    });
  } catch (error) {
    console.log(error);
  }
}, 15000);

app.listen(5000, () => {
  console.log("Server is listening on port 5000");
});
