const express = require('express')
const app = express();
const server = require('http').createServer(app)
const io = require("socket.io")(server)
const port = 3000;

let taxiSocket = null;

io.on("connection", socket => {
    console.log('a user connected :D')
    socket.on("chat message", msg => {
        console.log(msg)
        io.emit("chat message", msg)
    })

    socket.on("taxiRequest", routeResponse => {
        if (taxiSocket != null) {
            taxiSocket.emit("taxiRequest", routeResponse)
        }
    })

    socket.on("lookingForPassenger", () => {
        console.log("Someone is looking for a passenger")
        taxiSocket = socket
    })
})

server.listen(port, () => console.log("server running on port: " + port))