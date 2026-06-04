import express from "express";
import cors from "cors";
import videoRoutes from "./routes/video.routes";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/videos", videoRoutes);

app.get("/health", (_, res) => {
  res.status(200).json({
    status: "ok",
  });
});

export default app;