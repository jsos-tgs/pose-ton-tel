import { Server } from 'socket.io'

let io
const rooms = global._ptt_rooms || (global._ptt_rooms = new Map())

function getRoom(id){
  if(!rooms.has(id)) rooms.set(id, { id, players:[], status:'attente', started:false })
  return rooms.get(id)
}

export default function handler(req, res){
  if(!res.socket.server.io){
    io = new Server(res.socket.server, { path:'/api/socket', addTrailingSlash: false })
    res.socket.server.io = io

    io.on('connection', (socket)=>{
      socket.on('room:join', ({ room, nick, host })=>{
        socket.join(room)
        socket.data.room = room
        socket.data.nick = nick
        socket.data.host = !!host
        const r = getRoom(room)
        if(!r.players.find(p=>p.id===socket.id)){
          r.players.push({ id: socket.id, nick, host: !!host, ready:false })
        }
        io.to(room).emit('room:state', { players:r.players, status:r.status })
      })

      socket.on('player:ready', ({ room })=>{
        const r = getRoom(room)
        const p = r.players.find(p=>p.id===socket.id); if(p){ p.ready=true }
        io.to(room).emit('room:state', { players:r.players, status:r.status })
        // start when at least 2 ready
        if(r.players.filter(p=>p.ready).length >= 2 && !r.started){
          r.started = true
          r.status = 'countdown'
          let n = 3
          const ticker = setInterval(()=>{
            io.to(room).emit('game:countdown', n)
            if(n<=1){
              clearInterval(ticker)
              r.status = 'started'
              io.to(room).emit('game:start')
            }
            n--
          }, 900)
        }
      })

      socket.on('player:lose', ({ room, reason })=>{
        const r = getRoom(room)
        if(r && r.started){
          r.started = false
          r.status = 'ended'
          const loser = r.players.find(p=>p.id===socket.id)
          io.to(room).emit('game:end', { loser: loser?.nick || 'Un joueur', reason: reason || 'Détection' })
          // reset ready for next game
          r.players.forEach(p=>p.ready=false)
        }
      })

      socket.on('room:leave', ({ room })=>{
        socket.leave(room)
        const r = getRoom(room)
        r.players = r.players.filter(p=>p.id!==socket.id)
        io.to(room).emit('room:state', { players:r.players, status:r.status })
      })

      socket.on('disconnect', ()=>{
        const room = socket.data.room
        if(room){
          const r = getRoom(room)
          r.players = r.players.filter(p=>p.id!==socket.id)
          io.to(room).emit('room:state', { players:r.players, status:r.status })
        }
      })
    })
  }
  res.end()
}

export const config = {
  api: {
    bodyParser: false,
  },
}
