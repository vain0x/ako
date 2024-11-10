const TITLE = document.title
const DRY = false

// -----------------------------------------------
// util
// -----------------------------------------------

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()
const textToBase64 = s => bytesToBase64(textEncoder.encode(s))
const textFromBase64 = s => textDecoder.decode(base64ToBytes(s))
// https://developer.mozilla.org/ja/docs/Glossary/Base64
function base64ToBytes(base64) {
  const binString = window.atob(base64)
  return Uint8Array.from(binString, (m) => m.codePointAt(0))
}
function bytesToBase64(bytes) {
  return window.btoa(Array.from(bytes, byte => String.fromCodePoint(byte)).join(""))
}

// -----------------------------------------------
// app
// -----------------------------------------------

const storage = window.localStorage

let lastSha = storage.getItem("note2.lastSha") || null
let lastContents = storage.getItem("note2.lastContents") || null
let isSaved = !storage.getItem("note2.unsavedContents")

let settings = {
  autosave: storage.getItem("note2.autosave") === "1",
  accessToken: storage.getItem("gh.accessToken") || "",
  owner: storage.getItem("gh.owner") || "",
  repo: storage.getItem("gh.repo") || "",
  path: storage.getItem("gh.path") || "",
  branch: storage.getItem("gh.branch") || "",
}

// -----------------------------------------------
// main
// -----------------------------------------------

window.addEventListener("error", ev => {
  showStatus(`ERROR(window): ${ev.error}`)
  console.error("ERROR(window@error)", ev.error)
})

window.addEventListener("unhandledrejection", ev => {
  showStatus(`ERROR(unhandled): ${ev.reason}`)
  console.error("ERROR(unhandledrejection)", ev.reason)
})

const markAsSaved = () => {
  isSaved = true
  document.title = TITLE
  storage.removeItem("note2.unsavedContents")
}
const markAsUnsaved = () => {
  isSaved = false
  document.title = `${TITLE}*`
  storage.setItem("note2.unsavedContents", textEl.value)
}

const fetchContents = async () => {
  if (DRY) return await new Promise(resolve => setTimeout(() => resolve("fetched contents: " + ((new Date()).toLocaleString())), 1000))

  // curl -L \
  //   -H "Accept: application/vnd.github+json" \
  //   -H "Authorization: Bearer $TOKEN" \
  //   -H "X-GitHub-Api-Version: 2022-11-28" \
  //   https://api.github.com/repos/OWNER/REPO/contents/PATH

  let res
  {
    const { accessToken, owner, repo, path, branch } = settings
    if (!accessToken || !owner || !repo || !path || !branch) {
      console.log("settings", settings)
      throw new Error("settings incomplete")
    }

    const u = encodeURIComponent
    const url = `https://api.github.com/repos/${u(owner)}/${u(repo)}/contents/${u(path)}?ref=${u(branch)}`
    res = await fetch(url, {
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      }
    })
    if (!res.ok) {
      console.log("res", res.status)
      throw new Error(`Unexpected response (${res.status})`)
    }
  }

  {
    const data = await res.json()
    const { type, encoding, size, path, content, sha } = data
    console.log("fetched", type, encoding, size, path, sha)

    const decoded = textFromBase64(content)
    console.log("  decoded", decoded)

    lastSha = sha
    lastContents = decoded
    storage.setItem("note2.lastSha", lastSha)
    storage.setItem("note2.lastContents", lastContents)
    return decoded
  }
}

const fetchUpload = async value => {
  if (DRY) return await new Promise(resolve => setTimeout(resolve, 1000))

  // curl -L \
  // -X PUT \
  // -H "Accept: application/vnd.github+json" \
  // -H "Authorization: Bearer <YOUR-TOKEN>" \
  // -H "X-GitHub-Api-Version: 2022-11-28" \
  // https://api.github.com/repos/OWNER/REPO/contents/PATH \
  // -d '{"message":"my commit message","committer":{"name":"$NAME","email":"$EMAIL"},"content":"$CONTENTS"}'

  let res
  {
    const { accessToken, owner, repo, path, branch } = settings
    if (!accessToken || !owner || !repo || !path || !branch) {
      console.log("settings", settings)
      throw new Error("settings incomplete")
    }

    const data = {
      owner: owner,
      repo: repo,
      path: path,
      branch: branch,
      sha: lastSha || undefined,
      message: "update",
      // committer: committer,
      content: textToBase64(value),
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      }
    }

    const u = encodeURIComponent
    const url = `https://api.github.com/repos/${u(owner)}/${u(repo)}/contents/${u(path)}?ref=${u(branch)}`
    res = await fetch(url, {
      method: "PUT",
      body: JSON.stringify(data),
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      keepalive: true
    })
    if (!res.ok) {
      console.log("res", res.status)
      throw new Error(`Unexpected response (${res.status})`)
    }
  }

  {
    const data = await res.json()
    const { sha } = data.content
    console.log("fetched", sha)

    lastSha = sha
    lastContents = value
    storage.setItem("note2.lastSha", lastSha)
    storage.setItem("note2.lastContents", lastContents)
    return true
  }
}

const loadButtonEl = document.getElementById("load-button")
loadButtonEl.addEventListener("click", () => {
  performLoad()
})

const performLoad = () => {
  showStatus("loading...")
  !(async () => {
    const contents = await fetchContents()
    textEl.value = contents
    textEl.focus()
    showStatus("loaded")
    markAsSaved()
  })()
}

const saveButtonEl = document.getElementById("save-button")
saveButtonEl.addEventListener("click", () => {
  performSave()
})

const performSave = () => {
  const contents = textEl.value.trimEnd()
  console.log("contents", contents)
  if (contents === lastContents) {
    showStatus("no change")
    return
  }

  showStatus("saving...")
  !(async () => {
    await fetchUpload(contents)
    showStatus("saved")
    markAsSaved()
  })()
}

let statusTimeout
const showStatus = message => {
  const el = document.getElementById("status")
  el.textContent = message
  if (statusTimeout) clearTimeout(statusTimeout)
  statusTimeout = setTimeout(() => {
    statusTimeout = null
    el.textContent = ""
  }, 2000)
}

let currentAutosave
const textEl = document.getElementById("textarea")
textEl.value = storage.getItem("note2.unsavedContents") || lastContents || ""
textEl.addEventListener("input", () => {
  markAsUnsaved()

  // re-trigger autosave
  currentAutosave?.dispose()
  currentAutosave = null

  if (settings.autosave) {
    const flush = () => {
      console.log("autosave flush")
      currentAutosave = null
      dispose()
      performSave()
    }

    const dispose = () => {
      clearTimeout(timeout)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
    const timeout = setTimeout(flush, 3 * 1000)

    const handleVisibilityChange = () => {
      if (document.hidden) {
        flush()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    currentAutosave = { dispose }
  }
})

const controlDialogEl = document.getElementById("control-dialog")

const computeSettingsSummary = () => {
  return `github.com@${settings.accessToken ? "**" : ""}:${settings.owner || "_"}/${settings.repo || "_"}/${settings.path || "_"}?ref=${settings.branch || "_"}`
}

document.getElementById("control-button").addEventListener("click", () => {
  const autosaveEl = document.getElementsByName("autosave")[0]
  autosaveEl.checked = settings.autosave

  for (const name of [
    "accessToken",
    "owner",
    "repo",
    "path",
    "branch",
  ]) {
    const el = document.getElementsByName(name)[0]
    el.value = settings[name]
  }

  controlDialogEl.showModal()
})

const saveSettings = () => {
  const get = name => {
    return document.getElementsByName(name)[0].value.trimEnd() || ""
  }
  const set = (key, value) => {
    if (value) {
      storage.setItem(key, value)
    } else {
      storage.removeItem(key)
    }
  }
  const obj = {
    autosave: document.getElementsByName("autosave")[0].checked,
    accessToken: get("accessToken"),
    owner: get("owner"),
    repo: get("repo"),
    path: get("path"),
    branch: get("branch"),
  }

  set("note2.autosave", obj.autosave ? "1" : "")
  for (const name of [
    "accessToken",
    "owner",
    "repo",
    "path",
    "branch",
  ]) {
    set(`gh.${name}`, obj[name])
  }
  settings = obj

  if (!settings.autosave) {
    currentAutosave?.dispose()
    currentAutosave = null
  }
}

document.getElementById("control-close-button").addEventListener("click", () => {
  controlDialogEl.close()
})

const settingsFormEl = document.getElementById("settings-form")
settingsFormEl.addEventListener("submit", ev => {
  ev.preventDefault()
  controlDialogEl.close()
  saveSettings()
  handleInitOrSettingsChanged()
})

const handleInitOrSettingsChanged = () => {
  showStatus(computeSettingsSummary(settings))

  if (settings.autosave) {
    performLoad()
  }
}

handleInitOrSettingsChanged()
