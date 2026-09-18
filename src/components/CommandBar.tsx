import { useState } from 'react'

export function CommandBar({ onExecute }: { onExecute: (command: string) => string }) {
  const [value, setValue] = useState('')
  const [status, setStatus] = useState('')
  const submit = () => {
    if (!value.trim()) return
    try { setStatus(onExecute(value)); setValue('') }
    catch (e) { setStatus(e instanceof Error ? e.message : 'Błąd polecenia') }
  }
  return <div className="command-wrap">
    <div className="command-row">
      <span className="mic" aria-hidden>🎤</span>
      <input value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Powiedz lub wpisz: punkt P4 1200 800 0" autoCapitalize="none" inputMode="text" />
      <button onClick={submit}>Wykonaj</button>
    </div>
    <div className="command-help">Dyktuj mikrofonem klawiatury Androida. Np. „punkt P4 1200 800 0”, „ściana W05 P3 P4 2638 120”, „pomiar P0 P2 5776”, „+x 4826”.</div>
    {status && <div className="command-status">{status}</div>}
  </div>
}
