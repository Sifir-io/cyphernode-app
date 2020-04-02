FROM node:12
COPY . /usr/app
WORKDIR /usr/app
RUN npm i
RUN npm rebuild
# Bridge
EXPOSE 3010
CMD ["npm","start"]
