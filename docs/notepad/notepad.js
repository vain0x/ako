const TITLE = "notepad"

const main = () => {
  const textAreaElement = document.getElementById("textarea")

  const load = () => {
    let text = ""
    try {
      text = window.localStorage.getItem("text") ?? ""
    } catch {
      return
    }

    if (text !== "") {
      textAreaElement.value = text
    }
  }

  const save = () => {
    const text = textAreaElement.value
    if (text.length === 0) {
      window.localStorage.removeItem("text")
    } else {
      window.localStorage.setItem("text", text)
    }
  }

  let dirty = false

  const triggerAutoSave = () => {
    if (!dirty) {
      document.title = `${TITLE}*`
      dirty = true

      setTimeout(() => {
        if (dirty) {
          save()
          document.title = TITLE
          dirty = false
        }
      }, 300)
    }
  }

  textAreaElement.addEventListener("input", triggerAutoSave)

  load()
}

document.addEventListener("DOMContentLoaded", main)
