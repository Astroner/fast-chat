# Hi there
This is small application for fast chats(to send something from one device to another for example) with end-to-end encryption

## Development
```sh
npm i
npm run dev
```

## Deployment
### Node
```sh
npm i
npm run build
PORT=9092 HOST=localhost npm start
```

### Docker
```sh
sudo docker build -t fast-chat .
sudo docker run --name fast-chat -d --rm -p 9092:80 fast-chat
```

## Envs
 - HOST
 - PORT
 - MAX_ROOMS - maximum number of active rooms

## Use case 
User wants to send some info from phone to PC
 - Open app on PC
 - Scan QR on phone
 - Chat started
 - ...messaging...