/**
 * ERRORBOUNDARY — the safety net.
 *
 * Master prompt section 15: the UI must never crash. Normally, if any
 * component throws an error, React unmounts the whole app and the user
 * gets a blank white page — the worst possible thing to happen during a
 * five-minute demo.
 *
 * An Error Boundary catches that. If one page breaks, this shows a tidy
 * message and a "Back to dashboard" button instead, and the rest of the
 * console keeps working.
 *
 * This has to be written as a CLASS component. It is the one thing in
 * React that hooks cannot do, so don't be surprised by the older syntax.
 */

import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  /* React calls this automatically when a child component throws. */
  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    /* Logged so you can read the real cause in the browser console (F12). */
    console.error('[POLAR COMMAND CENTER] A page failed to render:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="card mx-auto mt-10 max-w-lg">
        <AlertTriangle size={22} strokeWidth={1.75} className="mb-3 text-[var(--red)]" />
        <h2 className="panel-title">This module could not be displayed</h2>
        <p className="panel-subtitle mb-4">
          The rest of the console is unaffected. Open the browser console (F12) to see the
          technical cause.
        </p>

        <pre
          className="mono mb-4 overflow-x-auto rounded border p-3 text-[11px] text-[var(--red)]"
          style={{ borderColor: 'var(--line)', background: 'var(--navy-950)' }}
        >
          {String(this.state.error)}
        </pre>

        <button
          type="button"
          className="btn"
          onClick={() => {
            this.setState({ error: null })
            this.props.onReset?.()
          }}
        >
          Back to dashboard
        </button>
      </div>
    )
  }
}
