import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.get("/db-test", async (_, res) => {
  const video = await prisma.video.create({
    data: {},
  });

  res.json(video);
});
export default app;