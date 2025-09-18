import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import io from 'socket.io-client'

let socket

function fmt(ms){
  const total = Math.floor(ms);
  const m = Math.floor(total/60000);
  const s = Math.floor((total%60000)/1000);
  const ms3 = String(total%1000).padStart(3,'0');
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${ms3}`;
}

export default function Game(){
  const r = useRouter()
  const { id } = r.query
  const isHost = r.query.host === '1'
  const [status,setStatus]=useState('Connexion…')
  const [players,setPlayers]=useState([])
  const [ready,setReady]=useState(false)
  const [started,setStarted]=useState(false)
  const [loser,setLoser]=useState(null)
  const [me,setMe]=useState('')
  const [count,setCount]=useState(0)
  const [elapsed,setElapsed]=useState(0)
  const startRef = useRef(0)
  const rafRef = useRef(0)

  useEffect(()=>{
    if(!id) return
    // ensure socket singleton
    if(!socket){
      socket = io({ path: '/api/socket', addTrailingSlash: false, transports: ['websocket','polling'] })
    }
    const nick = localStorage.getItem('ptt:nick') || `Joueur-${Math.floor(Math.random()*1000)}`
    setMe(nick)

    socket.emit('room:join', { room:id, nick, host: !!isHost })

    socket.on('room:state', (s)=>{ setPlayers(s.players); setStatus(s.status) })
    socket.on('game:countdown', (n)=>{ setCount(n) })
    socket.on('game:start', ()=>{ setStarted(true); setCount(0); setStatus('Ne touche plus !'); startClock(); attachGuard() })
    socket.on('game:end', (payload)=>{ stopClock(); setLoser(payload.loser); setStatus(payload.reason || 'Terminé'); detachGuard() })

    return ()=>{
      socket.emit('room:leave', { room:id })
      socket.off('room:state'); socket.off('game:countdown'); socket.off('game:start'); socket.off('game:end')
    }
  },[id, isHost])

  function startClock(){
    startRef.current = performance.now()
    const tick = ()=>{ setElapsed(performance.now() - startRef.current); rafRef.current = requestAnimationFrame(tick) }
    rafRef.current = requestAnimationFrame(tick)
  }
  function stopClock(){ cancelAnimationFrame(rafRef.current) }

  function handleReady(){
    setReady(true)
    socket.emit('player:ready', { room:id })
  }

  function attachGuard(){
    const end = (reason)=>{ socket.emit('player:lose', { room:id, reason }); }
    const onAny = (e)=>{ e && e.preventDefault && e.preventDefault(); end('Interaction détectée'); }
    const opts = { capture:true, passive:false }
    const handlers = [
      ['pointerdown', onAny],['pointerup', onAny],['touchstart', onAny],['touchend', onAny],
      ['mousedown', onAny],['mouseup', onAny],['wheel', onAny],['scroll', onAny],['keydown', onAny],['contextmenu', onAny]
    ]
    handlers.forEach(([t,fn])=>addEventListener(t,fn,opts))
    const onVis = ()=>{ if(document.hidden){ end('Changement d\'onglet'); } }
    const onBlur = ()=> end('Perte de focus')
    document.addEventListener('visibilitychange', onVis, true)
    addEventListener('blur', onBlur, true)
    // store detach on window
    window.__ptt_detach = ()=>{
      handlers.forEach(([t,fn])=>removeEventListener(t,fn,opts))
      document.removeEventListener('visibilitychange', onVis, true)
      removeEventListener('blur', onBlur, true)
    }
  }
  function detachGuard(){ if(window.__ptt_detach) window.__ptt_detach() }

  return (
    <div className="container">
      <div className="badge">Room {id}</div>
      <h1>Partie {isHost ? '(hôte)' : ''}</h1>
      <p className="muted">Invite ton ami sur cette URL, ou partage le code <strong>{id}</strong>.</p>

      <div className="card" style={{marginTop:12}}>
        <h3>Joueurs</h3>
        <ul style={{paddingLeft:18}}>
          {players.map(p => <li key={p.id}>{p.nick} {p.host ? '👑' : ''} {p.ready ? '✅' : '⏳'}</li>)}
        </ul>
        {!ready && !started && <button className="btn primary" onClick={handleReady}>Je suis prêt</button>}
        {count>0 && <h2 style={{marginTop:8}}>Départ dans… {count}</h2>}
        {started && !loser && <h2 style={{marginTop:8}}>{fmt(elapsed)}</h2>}
        {loser && <h2 style={{marginTop:8}}>{loser === me ? 'Tu as perdu 😅' : `${loser} a perdu 🎉`}</h2>}
        {loser && <p className="muted">Sanction IRL : le perdant paye l’addition 💸</p>}
      </div>
    </div>
  )
}
