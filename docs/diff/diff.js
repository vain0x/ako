import "./deps.minified.js"

const diff = window.Diff

/** バイナリである文字列か？ (制御文字が含まれていたらバイナリとみなす。) */
const isBinary = s => /[\x00-\x08\x0b\x0c\x0e\x0f\x7f]/.test(s)

const oldFilenameInput = document.getElementById("old-filename-input")
const oldTextarea = document.getElementById("old-textarea")
const newFilenameInput = document.getElementById("new-filename-input")
const newTextarea = document.getElementById("new-textarea")
const copyButton = document.getElementById("copy-button")
const copyTextarea = document.getElementById("copy-textarea") //as HTMLTextAreaElement
const diffDiv = document.getElementById("diff")

let current = ""
let lastId = 0

const onChange = () => {
  const id = ++lastId
  setTimeout(() => {
    if (id === lastId) {
      update()
    }
  }, 100)
}

const upload = async (key, file) => {
  const filenameInput = key === "old" ? oldFilenameInput : newFilenameInput
  const textarea = key === "old" ? oldTextarea : newTextarea

  const text = await file.text()
  if (isBinary(text)) {
    window.alert("Can't upload binary file.")
    return
  }
  filenameInput.value = file.name
  textarea.value = text
  onChange()
}

const computeNewFilename = (o, n) => n || (o != null && o !== "old.txt" ? o : "new.txt")

const update = () => {
  const oldFilename = oldFilenameInput.value.trim() || "old.txt"
  const oldText = oldTextarea.value
  const newFilename = computeNewFilename(oldFilename, newFilenameInput.value.trim())
  const newText = newTextarea.value

  const patch = diff.createTwoFilesPatch(oldFilename, newFilename, oldText, newText)
  current = patch
  diffDiv.textContent = patch
  newFilenameInput.setAttribute("placeholder", newFilename)
}

oldFilenameInput.addEventListener("change", onChange)
oldFilenameInput.addEventListener("input", onChange)
newFilenameInput.addEventListener("change", onChange)
newFilenameInput.addEventListener("input", onChange)
oldTextarea.addEventListener("change", onChange)
oldTextarea.addEventListener("input", onChange)
newTextarea.addEventListener("change", onChange)
newTextarea.addEventListener("input", onChange)

document.addEventListener("change", ev => {
  if (ev.target.type === "file") {
    const key = ev.target.getAttribute("data-key")
    const file = ev.target.files[0]
    if (key != null && file != null) {
      upload(key, file)
    }
  }
})

document.addEventListener("dragover", ev => {
  if (ev.target.closest("[dropzone]") != null) {
    ev.preventDefault()
  }
})

document.addEventListener("drop", ev => {
  if (ev.target.getAttribute("dropzone") != null) {
    ev.preventDefault()

    const key = ev.target.getAttribute("data-key")

    const file = (() => {
      for (let i = 0; i < ev.dataTransfer.items.length; i++) {
        const item = ev.dataTransfer.items[i]
        if (item.kind === "file")
          return item.getAsFile()
      }
      return null
    })()

    if (key != null && file != null) {
      upload(key, file)
    }
  }
})

copyButton.addEventListener("click", () => {
  copyTextarea.removeAttribute("hidden")
  copyTextarea.value = current
  copyTextarea.select()
  document.execCommand("copy")
})

// init
onChange()
