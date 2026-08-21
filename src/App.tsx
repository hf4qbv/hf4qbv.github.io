import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CODE_PERIOD,
  generateSteamGuardCode,
  isValidSecret,
} from './lib/steamGuard'
import './App.css'

const STORAGE_KEY = 'steam-guard-secret'

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.5 4.5 5.2v6.1c0 4.7 3.2 8.4 7.5 10.2 4.3-1.8 7.5-5.5 7.5-10.2V5.2L12 2.5Z"
        stroke="url(#shieldGrad)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m8.6 12.1 2.3 2.3 4.5-4.9"
        stroke="url(#shieldGrad)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="shieldGrad" x1="4.5" y1="2.5" x2="19.5" y2="21.5">
          <stop stopColor="#66c0f4" />
          <stop offset="1" stopColor="#1b9be4" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.6" />
      {off && (
        <path
          d="m4.5 19.5 15-15"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="8.5"
        y="8.5"
        width="11"
        height="11"
        rx="2.2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M15.5 5.5v-.3A2.2 2.2 0 0 0 13.3 3H6.7A2.2 2.2 0 0 0 4.5 5.2v6.6a2.2 2.2 0 0 0 2.2 2.2h.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 12.5 4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function App() {
  const [secret, setSecret] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '')
  const [remember, setRemember] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== null,
  )
  const [revealed, setRevealed] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number | undefined>(undefined)

  const timeSlice = Math.floor(now / 1000)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!isValidSecret(secret)) return
    let cancelled = false
    generateSteamGuardCode(secret, timeSlice).then((result) => {
      if (!cancelled) setCode(result)
    })
    return () => {
      cancelled = true
    }
  }, [secret, timeSlice])

  const valid = isValidSecret(secret)
  const remaining = CODE_PERIOD - (timeSlice % CODE_PERIOD)
  const progress = remaining / CODE_PERIOD

  const handleCopy = useCallback(async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      const area = document.createElement('textarea')
      area.value = code
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    setCopied(true)
    window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopied(false), 1600)
  }, [code])

  const toggleRemember = (checked: boolean) => {
    setRemember(checked)
    if (checked) {
      localStorage.setItem(STORAGE_KEY, secret)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const handleSecretChange = (value: string) => {
    setSecret(value)
    if (remember) {
      if (value) localStorage.setItem(STORAGE_KEY, value)
      else localStorage.removeItem(STORAGE_KEY)
    }
  }

  return (
    <div className="app">
      <div className="glow glow-a" />
      <div className="glow glow-b" />
      <div className="grid-overlay" />

      <main className="card">
        <header className="card-header">
          <div className="logo">
            <ShieldIcon />
          </div>
          <div>
            <h1>Steam Guard</h1>
            <p>Генератор кодов подтверждения</p>
          </div>
        </header>

        <label className="field-label" htmlFor="secret">
          Shared Secret
        </label>
        <div className={`input-wrap${secret && !valid ? ' invalid' : ''}`}>
          <input
            id="secret"
            type={revealed ? 'text' : 'password'}
            value={secret}
            onChange={(e) => handleSecretChange(e.target.value)}
            placeholder="Вставьте shared_secret"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            className="icon-btn"
            onClick={() => setRevealed((v) => !v)}
            title={revealed ? 'Скрыть' : 'Показать'}
          >
            <EyeIcon off={!revealed} />
          </button>
        </div>

        {secret && !valid && (
          <p className="hint error">Не похоже на base64 — проверьте секрет</p>
        )}

        <label className="remember">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => toggleRemember(e.target.checked)}
          />
          <span className="checkbox-mark" aria-hidden="true" />
          Запомнить секрет в этом браузере
        </label>

        <section className={`code-panel${valid ? ' active' : ''}`}>
          {valid ? (
            <>
              <div className="code-row">
                <div className="code" key={Math.floor(now / 30000)}>
                  {code.split('').map((char, i) => (
                    <span key={`${i}-${char}`} style={{ animationDelay: `${i * 60}ms` }}>
                      {char}
                    </span>
                  ))}
                </div>
                <button type="button" className="copy-btn" onClick={handleCopy}>
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  <span>{copied ? 'Скопировано' : 'Копировать'}</span>
                </button>
              </div>

              <div className="timer-row">
                <svg className="ring" viewBox="0 0 36 36" aria-hidden="true">
                  <circle className="ring-bg" cx="18" cy="18" r="15.5" />
                  <circle
                    className="ring-fg"
                    cx="18"
                    cy="18"
                    r="15.5"
                    strokeDasharray={`${progress * 97.4} 97.4`}
                  />
                </svg>
                <span className="timer-text">
                  Обновится через{' '}
                  <b>{remaining}</b> сек
                </span>
              </div>
            </>
          ) : (
            <p className="placeholder">Введите секрет, чтобы получить код</p>
          )}
        </section>

        <footer className="card-footer">
          <span className="dot" /> Код вычисляется локально, секрет никуда не отправляется
        </footer>
      </main>
    </div>
  )
}
