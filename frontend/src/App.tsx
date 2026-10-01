import { useEffect, useState } from 'react'
import './App.css'

type Health = {
  status: string
}

type Problem = {
  code?: string
  detail?: string
}

const errorMessages: Record<string, string> = {
  NOT_FOUND: 'That page or resource was not found.',
  VALIDATION_ERROR: 'Check the fields and try again.',
  INTERNAL_ERROR: 'Something went wrong. Try again.',
  HTTP_ERROR: 'The request could not be completed.',
}

function messageForProblem(problem: Problem) {
  if (problem.code && errorMessages[problem.code]) {
    return errorMessages[problem.code]
  }
  return problem.detail ?? 'Something went wrong.'
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
          const problem = (await response.json().catch(() => ({}))) as Problem
          throw new Error(messageForProblem(problem))
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
