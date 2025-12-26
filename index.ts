import express from "express";
import fileUpload from "express-fileupload";
import { fileURLToPath } from "url";
import cors from "cors";
import mimeTypes from "mime-types";
import path from "path";
import { checkSize } from "./Functions/checkSize.ts";
import { generateName } from "./Functions/generateName.ts";
import { spaceManagement } from "./Functions/spaceManagement.ts";
const app = express();
app.use(fileUpload());
app.use(cors());
const port = 3030;
const allowedDirectorySize = 40 * 1024 * 1024 * 1024;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const videoDirectory = path.join(__dirname, "videos");

app.get("/", (req, res) => {
  res.type("text/plain");
  return res.send("Upload syntax: curl -F 'video=@/path/to/videoFile' https://videos.kloudify.host/upload");
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

  let videoSizeCheck: boolean = checkSize(videoFile);

  if (!videoSizeCheck) {
    return res.send("\nVideo size must be less than 100MB\n");
  }

  let spaceManaged: boolean | void = spaceManagement(allowedDirectorySize, videoFile.size, videoDirectory);

  if (!spaceManaged) {
    return res.status(500).send("\nAn error occurred\n");
  }

  let randomName: string = generateName();

  const videoFilePath: string = path.join(videoDirectory, randomName + path.extname(videoFile.name));

  videoFile.mv(videoFilePath, (err) => {
    if (err) {
      console.log(err);
      return res.status(500).send("\nAn error occurred\n");
    }

    return res.send(`\nhttps://videos.kloudify.host/${randomName + path.extname(videoFile.name)}\n`);
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
