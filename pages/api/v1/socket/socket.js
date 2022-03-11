import { Server } from 'socket.io'

// server side socket io
const ioHandler = (req, res) => {
    if (!res.socket.server.io) {
        const io = new Server(res.socket.server)


        // connection and messages here
        io.on('connection', socket => {
            socket.broadcast.emit('a user connected')
            socket.on('hello', msg => {
                socket.emit('hello', 'world!')
            })
        })


        res.socket.server.io = io
    } else {
        console.log('socket.io already running')
    }
    res.end()
}

export const config = {
    api: {
        bodyParser: false
    }
}

export default ioHandler