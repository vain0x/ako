const textInput = document.getElementById("text") //as HTMLInputElement
const hideButton = document.getElementById("hide")
const previewElement = document.getElementById("preview")
const tweetLink = document.getElementById("tweet")

const encode = text =>
  text.replace(/\[([^\[\]]+)\]/g, (_, s) => "[" + encodeURIComponent(s) + "]")

const decode = text => {
  try {
    return text.replace(/\[([^\[\]]+)\]/g, (_, s) => "[" + decodeURIComponent(s) + "]")
  } catch {
    return
  }
}

const hiddenUrl = text => {
  const url = new URL(document.location.href)
  url.search = ""
  url.hash = ""
  url.searchParams.set("text", encode(text))
  return url.toString()
}

hideButton.addEventListener("click", () => {
  const text = textInput.value
  const l = textInput.selectionStart
  const r = textInput.selectionEnd

  const unmask = text[l] === "[" && text[r - 1] === "]"
  if (unmask) {
    const newText = text.slice(0, l) + text.slice(l + 1, r - 1) + text.slice(r)
    textInput.value = newText
    textInput.setSelectionRange(l, r - 2)
    textInput.focus()
    update()
    return
  }

  const newText = text.slice(0, l) + "[" + text.slice(l, r) + "]" + text.slice(r)
  textInput.value = newText
  textInput.setSelectionRange(l, r + 2)
  textInput.focus()
  update()
})

const init = () => {
  const url = new URL(document.location.search, "http://localhost")
  const encoded = url.searchParams.get("text") ?? ""
  if (encoded !== "") {
    const decoded = decode(encoded)
    if (decoded != undefined) {
      textInput.value = decoded
    }
  }

  if (textInput.value !== "") {
    const text = textInput.value
    textInput.setSelectionRange(text.length, text.length)
  }
}

const update = () => {
  const text = textInput.value
  const hidden = text.replace(/\[(.+)\]/g, () => "**")
  previewElement.textContent = hidden

  const url = new URL("/intent/tweet", "https://twitter.com")
  url.searchParams.set("text", hidden + " / " + hiddenUrl(text))
  tweetLink.href = url.toString()
}

textInput.addEventListener("input", update)
textInput.addEventListener("change", update)

init()
update()
