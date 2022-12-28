
const elemOf = id => document.getElementById(id)
const appElement = document.getElementById("app")
const newKeyInput = elemOf("new-key-input")
const newValueInput = elemOf("new-value-input")
const entryGrid = elemOf("entry-grid")

// -----------------------------------------------
// Data
// -----------------------------------------------

let lastId = 0
let entries = []

const loadData = () => {
  try {
    const text = window.localStorage.getItem("entries") ?? ""
    const array = JSON.parse(text)

    const ok = Array.isArray(array)
      && array.every(tuple =>
        Array.isArray(tuple)
        && tuple.length >= 3
        && (() => {
          const [id, key, value] = tuple
          return Number.isFinite(id) && typeof key === "string" && key && typeof value === "string" && value
        })()
      )

    if (ok) {
      lastId = array.reduce((n, [id]) => Math.max(id, n), 0)
      entries.push(...array)
    }
  } catch (err) {
    // OK
  }
}

const saveData = () => {
  try {
    if (entries.length === 0) {
      window.localStorage.clear()
      return
    }

    window.localStorage.setItem("entries", JSON.stringify(entries))
  } catch (err) {
    window.alert(`エラー: 保存: ${err}`)
  }
}



// -----------------------------------------------
// Render
// -----------------------------------------------

const rebuildGrid = () => {
  entryGridAbortController?.abort()
  entryGridAbortController = new AbortController()
  const { signal } = entryGridAbortController

  signal.addEventListener("abort", () => {
    entryGrid.innerHTML = ""
  })

  for (const [id, key, value, details] of entries) {
    const b = document.createElement("button")
    b.type = "button"
    b.className = "row-button"
    b.addEventListener("click", () => {
      window.alert(`key: ${key}\nvalue: ${value}\n\ndetails: ${details}\n\nid: ${id}`)
    }, { signal })

    const bc = document.createElement("div")
    bc.className = "row-action cell"
    bc.append(b)

    const k = document.createElement("div")
    k.textContent = key
    k.className = "row-key cell"

    const v = document.createElement("div")
    v.textContent = value
    v.className = "row-value cell"

    entryGrid.append(bc, k, v)
  }
}

let entryGridAbortController = new AbortController()



// -----------------------------------------------
// Controller
// -----------------------------------------------

const init = () => {
  window.addEventListener("error", ev => {
    window.alert(`window.error: ${ev.error}`)
  })

  const newKeySpeakButton = elemOf("new-key-speak-button")
  newKeySpeakButton.addEventListener("click", () => {
    attemptRecognize(newKeyInput, newKeySpeakButton)
  })

  const newValueSpeakButton = elemOf("new-value-speak-button")
  newValueSpeakButton.addEventListener("click", () => {
    attemptRecognize(newValueInput, newValueSpeakButton)
  })

  const addForm = elemOf("add-form")
  addForm.addEventListener("submit", ev => {
    ev.preventDefault()
    const key = newKeyInput.value
    const value = newValueInput.value
    entries.splice(0, 0, [++lastId, key, value])

    window.requestAnimationFrame(() => {
      newKeyInput.value = ""
      newValueInput.value = ""
      rebuildGrid()
    })

    saveData()
  })

  loadData()

  window.requestAnimationFrame(() => {
    rebuildGrid()
  })
}

// Entrypoint
{
  document.addEventListener("DOMContentLoaded", () => {
    init()
  })
}



// -----------------------------------------------
// 音声認識
// -----------------------------------------------

const recognitionEvent = new EventTarget()

{
  const SpeechRecognition = window.webkitSpeechRecognition ?? window.SpeechRecognition
  let recognition

  if (SpeechRecognition != null) {
    document.body.setAttribute("data-speech-recognition", "true")
  }

  let recognitionAbortController

  recognitionEvent.addEventListener("start", ev => {
    const { resolve, reject, setSpeaking } = ev

    if (SpeechRecognition == null) {
      throw new Error("音声認識APIがありません")
    }

    if (recognition == null) {
      recognition = new SpeechRecognition()
      recognition.lang = "ja"
    }

    const ac = new AbortController()
    const { signal } = ac

    recognitionAbortController?.abort()
    recognitionAbortController = ac

    recognition.addEventListener("result", ev => {
      const text = ev.results[0]?.[0]?.transcript ?? ""
      resolve(text)
      ac.abort()
    }, { signal })
    recognition.addEventListener("speechstart", () => {
      setSpeaking(true)
    }, { signal })
    recognition.addEventListener("speechend", () => {
      setSpeaking(false)
    }, { signal })
    recognition.addEventListener("error", ev => {
      reject(new Error(`音声認識: ${ev.error}`))
      ac.abort()
    }, { signal })

    recognition.start()

    signal.addEventListener("abort", () => {
      recognition.stop()
    })
  })
}

const attemptRecognize = (input, button) => {
  const promise = new Promise((resolve, reject) => {
    const e = new Event("start")
    e.resolve = resolve
    e.reject = reject
    e.setSpeaking = value => button.toggleAttribute("data-speaking", value)
    recognitionEvent.dispatchEvent(e)
  }).then(value => {
    if (value) {
      input.value = value
    }
  }, err => {
    window.alert(`エラー: ${err}`)
  })

  button.setAttribute("data-waiting", "true")
  promise.finally(() => {
    button.removeAttribute("data-waiting")
    button.removeAttribute("data-speaking")
  })
}
