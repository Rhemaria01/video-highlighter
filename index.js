require("dotenv").config({ override: true });
const fs = require("fs");
const OpenAI = require("openai");
const ffmpeg = require("fluent-ffmpeg");
const inputFile = "video_05.mp4";
const inputDirectory = "input_directory/";
const outputDirectory = "output_directory/";
const openai = new OpenAI();
let dir = `./${inputFile.split(".")[0]}_output/`;
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}
let promptForGPT = `Create a JSON array showcasing 5-6 captivating moments from a YouTube video. Each segment should span between 10 to 15 seconds, amalgamating at least 2-3 timestamps to ensure ample duration.
While merging, it's possible for highlights to commence mid-sentence or conclude abruptly; hence, include sufficient context to maintain coherence.
Ensure each highlight stands independently without relying on others.
Prioritize entertainment value and comprehensiveness to effectively encapsulate the video's essence.
Assign a virality score ranging from 0 to 1 to each highlight and provide a unique heading for each based on its content.
Headings should feel like an youtube videos title and it should have high chance of getting viral.
Format the answer as follows: [{"virality_score":"0.5","highlight_heading":"heading text ...","start":"00.00","end":"15.12"},...].
Don't add time units to in timestamp of your answer and it should has precision of 4 values after the decial.
Don't make use of code block in your answer just directly send your answer because I am parsing the JSON string.
This is the transcription:
`;
async function main() {
  console.log("Starting..");
  const chunkSize = 25 * 1024 * 1024;
  await new Promise((resolve, reject) => {
    ffmpeg(inputDirectory + inputFile)
      .outputOptions("-f", "segment")
      .outputOptions("-segment_time", "270") // adjust segment_time as needed
      .outputOptions("-segment_format", "mp4")
      .outputOptions("-reset_timestamps", "1")
      .outputOptions("-map", "0")
      .outputOptions("-c", "copy")
      .outputOptions("-segment_list_size", chunkSize)
      .output(`${outputDirectory}output_%03d.mp4`)
      .on("end", () => {
        console.log("Splitting complete");
        resolve();
      })
      .on("error", (err) => {
        console.error("Error occurred:", err);
        reject(err);
      })
      .run();
  });
  fs.readdir(outputDirectory, async (err, files) => {
    console.log("this started");
    if (err) {
      console.error("Error reading directory:", err);
      return;
    }

    const videoChunks = files.filter((file) => file.endsWith(".mp4"));
    console.log("Video chunks:", videoChunks);
    let accumulatedPrompt = "";
    let videosSentToGpt = [];
    for (let i = 0; i < videoChunks.length; i++) {
      const video = outputDirectory + "/" + videoChunks[i];
      let videoPrompt = await transcribeAndExtract(video);
      accumulatedPrompt += videoPrompt;
      videosSentToGpt.push(videoChunks[i]);
      // if first video
      if (i === 0) continue;

      //every 3 videos
      if (i % 3 === 0) {
        await sendTranscriptionsToGpt(accumulatedPrompt);
        accumulatedPrompt = "";
        console.log(videosSentToGpt);
        videosSentToGpt = [];
        continue;
      }

      //if any video is left
      if (i === videoChunks.length - 1) {
        await sendTranscriptionsToGpt(accumulatedPrompt);
        accumulatedPrompt = "";
        console.log(videosSentToGpt);
        videosSentToGpt = [];
      }
    }
  });
}
let count = 1;
async function transcribeAndExtract(inputFile) {
  console.log("transcribing", inputFile);
  let promptTranscription = "";
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(inputFile),
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  });
  console.log("Received response, creating prompt...");

  // Generate prompt for ChatGPT
  for (let i = 0; i < transcription.segments.length; i++) {
    const segment = transcription.segments[i];
    promptTranscription +=
      `Starts at ${segment.start.toFixed(4)}s\n` +
      `Ends at ${segment.end.toFixed(4)}s\n` +
      `${segment.text}\n`;
  }
  return promptTranscription;
}

async function sendTranscriptionsToGpt(prompt) {
  console.log(
    "OpenAi Api Call with merged transcriptions from multiple videos"
  );
  const timeRanges = [];

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: promptForGPT + prompt,
      },
    ],
    model: "gpt-4-0125-preview",
  });
  timeRanges.push(...JSON.parse(completion.choices[0].message.content));

  console.log(timeRanges);

  // Create clips from ranges

  timeRanges.forEach((timeRange, index) => {
    const startTime = timeRange.start;
    const endTime = timeRange.end;
    const outputFile = `${dir}${count} ${timeRange.highlight_heading}.mp4`;
    count++;
    // Extract clip for the current time range
    extractClip(inputFile, outputFile, startTime, endTime)
      .then(() => {
        console.log(`Clip ${index} extraction successful`);
      })
      .catch((err) => {
        console.error(`Clip ${index} extraction failed:`, err);
      });
  });
}
// Function to extract clip using ffmpeg
function extractClip(inputFile, outputFile, startTime, endTime) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputFile)
      .setStartTime(startTime)
      .setDuration(endTime - startTime)
      .output(outputFile)
      .on("end", () => {
        console.log("Clip extraction finished");
        resolve();
      })
      .on("error", (err) => {
        console.error("Error extracting clip:", err);
        reject(err);
      })
      .run();
  });
}
main();

// Example timeranges Without extracting transcriptions
// const timeRanges = [
//   { start: "00.000", end: "16.840" },
//   { start: "117.060", end: "134.900" },
//   { start: "186.380", end: "211.140" },
//   { start: "299.660", end: "328.700" },
//   { start: "381.140", end: "425.180" },
// ];
// timeRanges.forEach((timeRange, index) => {
//   const startTime = timeRange.start;
//   const endTime = timeRange.end;
//   const outputFile = `output_${index}.mp4`; // Output file name with index

//   // Extract clip for the current time range
//   extractClip(inputFile, outputFile, startTime, endTime)
//     .then(() => {
//       console.log(`Clip ${index} extraction successful`);
//     })
//     .catch((err) => {
//       console.error(`Clip ${index} extraction failed:`, err);
//     });
// });
