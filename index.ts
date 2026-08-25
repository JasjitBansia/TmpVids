import express from "express";
import fileUpload from "express-fileupload";
import dotenv from "dotenv";
dotenv.config();
import { fileURLToPath } from "url";
import cors from "cors";
import mimeTypes from "mime-types";
import path from "path";
import fs from "fs";
import { checkSize } from "./Functions/checkSize.ts";
import { generateName } from "./Functions/generateName.ts";
import { spaceManagement } from "./Functions/spaceManagement.ts";
import { loadEnvFile } from "process";
const app = express();
app.use(fileUpload());
app.use(cors());
const port = 3030;
const allowedDirectorySize = 40 * 1024 * 1024 * 1024;
let adminTokenENV = process.env.ADMIN_KEY;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadEnvFile(path.join(__dirname, ".env"));
const videoDirectory = path.join(__dirname, "videos");

app.get("/", (req, res) => {
  res.type("text/plain");
  return res.send(
    "Upload syntax: curl -F 'video=@/path/to/videoFile' https://videos.kloudify.host/upload",
  );
});

app.delete("/delete", (req, res) => {
  let videoID: string = req.query.videoID as string;
  let adminToken: string = req.query.token as string;
  if (videoID && adminToken && adminToken === adminTokenENV) {
    let identifier;
    if (videoID.startsWith("http")) {
      identifier = videoID.substring(videoID.lastIndexOf("/") + 1, videoID.length);
    } else {
      identifier = videoID;
    }

    try {
      let videoPath = path.join(__dirname, `/videos/${identifier}`);
      let exists = fs.existsSync(videoPath);
      if (!exists) return res.send("Provided video does not exist");
      fs.unlinkSync(videoPath);
      return res.send("Video deleted");
    } catch (e) {
      return res.send(e);
    }
  } else {
    return res.send("Invalid parameters provided");
  }
});

app.get("/upload", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "upload.html"));
});

app.post("/upload", (req, res) => {
  let videoFile = req.files?.video as fileUpload.UploadedFile;
  let mimeType: string | boolean = mimeTypes.lookup(videoFile.name);

  if (!videoFile) {
    return res.status(400).send("\nProvide a video to upload\n");
  }

  if (!mimeType || !mimeType.toString().startsWith("video/")) {
    return res.status(400).send("\nProvide a valid video file\n");
  }

  let tokenQuery = req.query.token as string;

  let videoSizeCheck: boolean = checkSize(videoFile);

  if (!tokenQuery || (tokenQuery && tokenQuery !== adminTokenENV)) {
    if (!videoSizeCheck) {
      return res.send("\nVideo size must be less than 100MB\n");
    }
  }

  let spaceManaged: boolean | void = spaceManagement(
    allowedDirectorySize,
    videoFile.size,
    videoDirectory,
  );

  if (!spaceManaged) {
    return res.status(500).send("\nAn error occurred\n");
  }

  let randomName: string = generateName();

  const videoFilePath: string = path.join(
    videoDirectory,
    randomName + path.extname(videoFile.name),
  );

  videoFile.mv(videoFilePath, (err) => {
    if (err) {
      console.log(err);
      return res.status(500).send("\nAn error occurred\n");
    }
    let conciseQuery: string = req.query.concise as string;

    if (conciseQuery && conciseQuery.toLowerCase() === "true") {
      return res.send(
        `\n[video](https://videos.kloudify.host/${randomName + path.extname(videoFile.name)})\n`,
      );
    } else {
      return res.send(
        `\nhttps://videos.kloudify.host/${randomName + path.extname(videoFile.name)}\n`,
      );
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
