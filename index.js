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


  function runImageMagickCommand (command) {
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
      const command = `magick ${inputPath} ${outputPath}`;
      // Run the command
      const result = await runImageMagickCommand(command);
      console.log('Image converted successfully:', result);
    } catch (error) {
      console.error('Error converting image:', error);
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

  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    const buffer = req.file.buffer;
    const filename = req.file.originalname;

    // Write buffer to a temporary file
    const tempFilePath = './' + filename;
    fs.writeFileSync(tempFilePath, buffer);

    args = ['--extract-media', './', '-t', 'markdown-bracketed_spans-raw_html-native_spans', '-o', 'markdown.md'];

    // Set your callback function
    const callback = async function (err, result) {

      console.log(tempFilePath)
      // Delete the temporary file
      const fsData = fs.readFileSync('markdown.md');

      let responsive = fsData.toString();
      const files = await fs.promises.readdir('./media');


      try {

        const imageProcessingPromises = files?.map(async file => {
          const imagePath = `./media/${file}`;
          const outputPath = `./media-converted/${file.replace(/\.[^.]*$/, '.png')}`;
          await convertImage(imagePath, outputPath);
          const imageBuffer = fs.readFileSync(outputPath);

          fs.unlinkSync(imagePath);
          fs.unlinkSync(outputPath);
          const base64Image = Buffer.from(imageBuffer).toString('base64');

          responsive = responsive.split(`![](./media/${file})`).join(`![](data:image/png;base64,${base64Image})`);
        });

        await Promise.all(imageProcessingPromises);
      } catch (error) {
        console.error('Error processing images:', error);
        return res.status(500).send('Error converting Markdown to HTML');
      }



      if (err) {
        console.error('Oh Nos: ', err);
        return res.status(500).send('Error converting Markdown to HTML');
      }
      removeFileIfExists(tempFilePath)
      removeFileIfExists('markdown.md')
      return res.send(responsive);
    };

    // Convert temporary file to HTML using node-pandoc
    nodePandoc(tempFilePath, args, callback);
    // const filetest = fs.readFileSync('./output.md')

    // console.log(filetest)
  } catch (error) {
    console.error('Error converting Markdown to HTML:', error);
    res.status(500).send('Error converting Markdown to HTML');
  }
});
// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
