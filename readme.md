#install on local
npm install

#don't forget create media and media-converted folders

mkdir  -p ./media
mkdir  -p ./media-converted

# Run on local

node index.js

# Build and run with docker
docker buildx build --platform linux/amd64 -t pandoc-imagemagick-app .
docker run -d -p 4000:4000 pandoc-imagemagick-app
