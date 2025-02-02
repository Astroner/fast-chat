# Hi there
This is a small application for fast chats(to send something from one device to another for example) with end-to-end encryption

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
### Normal
User wants to send some info from phone to PC
 - Open app on PC
 - Scan QR on phone
 - Chat starts
 - ...messaging...

### Relay mode
User wants to connect 2 devices without cameras to scan QR codes.
 - Open app on PC1
 - Press "Relay connection" button
 - Scan QR code with phone
 - Open app on PC2
 - Press "Relay connection" button
 - Scan second QR code with phone
 - Chat between 2 PCs starts
 - ...messaging...