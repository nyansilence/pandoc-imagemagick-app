FROM node:21

# Setup pandoc and imagemagick
RUN wget https://github.com/jgm/pandoc/releases/download/3.1.13/pandoc-3.1.13-1-amd64.deb

RUN dpkg -i pandoc-3.1.13-1-amd64.deb

RUN wget https://imagemagick.org/archive/binaries/magick

RUN chmod +x magick

RUN apt update -y
RUN apt install libfuse2 -y

RUN cp ./magick /usr/bin/magick

# Setup app
WORKDIR /app
COPY ["package.json", "package-lock.json*", "./"]
RUN npm install
COPY . .


# Create 2 folder
RUN mkdir  -p ./media
RUN mkdir  -p ./media-converted



EXPOSE 4000
CMD ["node", "index","-p","4000"]
