import { useEffect, useState } from 'react'
import './App.css'

type Health = {
  status: string
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; health: Health }
  | { kind: 'error'; message: string }

function App() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/health', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`)
        }
        return (await response.json()) as Health
      })
      .then((health) => {
        setState({ kind: 'ready', health })
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        const message = error instanceof Error ? error.message : 'Unknown error'
        setState({ kind: 'error', message })
      })

    return () => controller.abort()
  }, [])

  return (
    <main>
      <h1>Diet plan</h1>
      <p>Backend health</p>
      {state.kind === 'loading' && <p>Checking the API…</p>}
      {state.kind === 'ready' && (
        <pre>
          <code>{JSON.stringify(state.health, null, 2)}</code>
        </pre>
      )}
      {state.kind === 'error' && <p role="alert">{state.message}</p>}
    </main>
  )
}

export default App
