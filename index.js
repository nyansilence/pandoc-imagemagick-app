// Import necessary modules
const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const nodePandoc = require('node-pandoc');
const cors = require('cors');

const fs = require('node:fs');
const { exec } = require('child_process');
// Initialize Express app
const app = express();
const port = process.env.PORT || 3001;
app.use(cors({
  origin: '*'
}));
// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Configure body parser middleware

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Handle Markdown to HTML conversion
app.post('/convert', cors(), upload.single('markdownFile'), async (req, res) => {


  function runCommand (command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        if (stderr) {
          reject(new Error(stderr));
          return;
        }
        resolve(stdout);
      });
    });
  }

  async function convertImage (inputPath, outputPath) {
    try {
      // Construct the ImageMagick command
      const command = `magick ${inputPath} -background white -alpha remove -alpha off ${outputPath}`;
      // Run the command
      const result = await runCommand(command);
      console.log('Image converted successfully:', result);
    } catch (error) {
      console.error('Error converting image:', error);
    }
  }

  async function convertDocxToHtml (inputPath) {
    try {
      // Construct the ImageMagick command
      const command = `pandoc ${inputPath} --extract-media ./ --webtex -t html5 -o markdown.html`;
      // Run the command
      await runCommand(command);


      // let responsive = fsData.toString();
      const files = await fs.promises.readdir('./media');

      const fsData = fs.readFileSync('markdown.html');

      let responsive = fsData.toString();
      const imageProcessingPromises = files?.map(async file => {
        const imagePath = `./media/${file}`;
        const outputPath = `./media-converted/${file.replace(/\.[^.]*$/, '.png')}`;
        await convertImage(imagePath, outputPath);
        const imageBuffer = fs.readFileSync(outputPath);

        fs.unlinkSync(imagePath);
        fs.unlinkSync(outputPath);
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        responsive = responsive.split(`src="./media/${file}"`).join(`src="data:image/png;base64,${base64Image}"`);
      });

      await Promise.all(imageProcessingPromises);

      return responsive;
    } catch (error) {
      console.error('Error converting docx:', error);
    }
  }


  const removeFileIfExists = (filePath) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`File ${filePath} removed successfully.`);
    } else {
      console.log(`File ${filePath} does not exist.`);
    }
  };

  const sendResult = (tempFilePath, responsive) => {
    removeFileIfExists(tempFilePath)
    removeFileIfExists('markdown.html')
    res.send(responsive);
  }

  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    const buffer = req.file.buffer;
    const filename = req.file.originalname;

    // Write buffer to a temporary file
    const tempFilePath = './' + filename;
    fs.writeFileSync(tempFilePath, buffer);
    const docxHtml = await convertDocxToHtml(tempFilePath)
    sendResult(tempFilePath, docxHtml.toString())
  } catch (error) {

  }

});
// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
