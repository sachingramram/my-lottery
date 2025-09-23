"use client";
import { useState } from "react";

export default function Admin() {
  const [u,setU] = useState(""); const [p,setP] = useState(""); const [msg,setMsg]=useState("");
  async function login(){
    const res = await fetch("/api/login",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ username:u, password:p })});
    const json = await res.json();
    setMsg(json.ok ? "Logged in. You can edit charts now." : (json.error||"Failed"));
  }
  return (
    <div className="bg-[var(--yellow)] border-strong border-[var(--red)] p-4 max-w-md mx-auto">
      <h2 className="text-[var(--red)] text-2xl font-bold text-center mb-3">Admin Login</h2>
      <input className="w-full mb-2 p-2 border border-[var(--red)]" placeholder="Username" value={u} onChange={e=>setU(e.target.value)}/>
      <input className="w-full mb-3 p-2 border border-[var(--red)]" placeholder="Password" type="password" value={p} onChange={e=>setP(e.target.value)}/>
      <button onClick={login} className="w-full bg-[var(--yellow)] border border-[var(--red)] text-[var(--red)] py-2">Login</button>
      {msg && <p className="text-[var(--red)] mt-3 text-center">{msg}</p>}
    </div>
  );
}
