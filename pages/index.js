import { useState } from 'react'
import { useRouter } from 'next/router'

function uid(len=6){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s=''; for(let i=0;i<len;i++) s+=chars[Math.floor(Math.random()*chars.length)]
  return s
}

export default function Home(){
  const r = useRouter()
  const [code,setCode]=useState('')
  const [nick,setNick]=useState('')

  return (
    <div className="container">
      <div className="badge">Prototype • Next.js + Socket.io</div>
      <h1>Pose ton tel — Duel anti-smartphone</h1>
      <p className="muted">Crée une partie et invite un ami. Le premier qui touche son téléphone a perdu.</p>

      <div className="card" style={{marginTop:12}}>
        <h3>Créer une partie</h3>
        <div className="row" style={{marginTop:8}}>
          <input className="input" placeholder="Ton pseudo" value={nick} onChange={e=>setNick(e.target.value)} />
          <button className="btn primary" onClick={()=>{
            const id = uid();
            if(nick) localStorage.setItem('ptt:nick', nick);
            r.push(`/game/${id}?host=1`)
          }}>Créer</button>
        </div>
        <p className="muted" style={{fontSize:12, marginTop:8}}>Envoie le code à ton ami : il rejoindra la partie depuis son téléphone.</p>
      </div>

      <div className="card" style={{marginTop:12}}>
        <h3>Rejoindre une partie</h3>
        <div className="row" style={{marginTop:8}}>
          <input className="input" placeholder="Code de la partie (ex: 7K2F9Q)" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} />
          <button className="btn" onClick={()=> r.push(`/game/${(code||'').trim()}`) }>Rejoindre</button>
        </div>
      </div>

      <div className="card" style={{marginTop:12}}>
        <h3>Règles</h3>
        <ul>
          <li>Deux joueurs rejoignent la même partie.</li>
          <li>Décompte 3…2…1… Lâche ton tel.</li>
          <li>Le premier qui touche / change d’onglet / verrouille perd.</li>
        </ul>
      </div>
    </div>
  )
}
