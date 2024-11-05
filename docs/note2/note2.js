const TITLE = "note2"
const storage = window.localStorage
const events = new EventTarget()

const loadSettings = () => {
  return {
    accessToken: storage.getItem("gh.accessToken") || "",
    owner: storage.getItem("gh.owner") || "",
    repo: storage.getItem("gh.repo") || "",
    path: storage.getItem("gh.path") || "",
    branch: storage.getItem("gh.branch") || "",
  }
}

let settings = loadSettings()

// -----------------------------------------------
// util
// -----------------------------------------------

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()
const textToBase64 = s => bytesToBase64(textEncoder.encode(s))
const textFromBase64 = s => textDecoder.decode(base64ToBytes(s))
// https://developer.mozilla.org/ja/docs/Glossary/Base64
function base64ToBytes(base64) {
  const binString = atob(base64);
  return Uint8Array.from(binString, (m) => m.codePointAt(0))
}
function bytesToBase64(bytes) {
  return btoa(Array.from(bytes, byte => String.fromCodePoint(byte)).join(""))
}

// -----------------------------------------------
// settings dialog
// -----------------------------------------------

const settingsDialogsEl = document.getElementById("settings-dialog")

const computeSettingsSummary = () => {
  return `github.com@${settings.accessToken ? "**" : ""}:${settings.owner || "_"}/${settings.repo || "_"}/${settings.path || "_"}?ref=${settings.branch || "_"}`
}

const saveSettings = () => {
  const get = name => {
    console.log("get", name, [...document.getElementsByName(name)])
    return document.getElementsByName(name)[0].value.trimEnd() || ""
  }
  const obj = {
    accessToken: get("accessToken"),
    owner: get("owner"),
    repo: get("repo"),
    path: get("path"),
    branch: get("branch"),
  }

  for (const [name, value] of Object.entries(obj)) {
    if (value) {
      storage.setItem(`gh.${name}`, value)
    } else {
      storage.removeItem(`gh.${name}`)
    }
  }
  settings = obj
  events.dispatchEvent(new Event("settingsChanged"))
}

// -----------------------------------------------
// main
// -----------------------------------------------

let lastSha
let lastContents

export const fetchContents = async () => {
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
    lastSha = sha
    console.log("fetched", type, encoding, size, path, sha)

    const decoded = textFromBase64(content)
    console.log("  decoded", decoded)
    lastContents = decoded
    return decoded
  }
}

const fetchUpload = async value => {
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
      }
    })
    if (!res.ok) {
      console.log("res", res.status)
      throw new Error(`Unexpected response (${res.status})`)
    }
  }

  {
    const data = await res.json()
    const { sha } = data
    lastSha = sha
    lastContents = value
    console.log("fetched", sha)
    return true
  }
}

// let dirty = false

// const triggerAutoSave = () => {
//   if (!dirty) {
//     document.title = `${TITLE}*`
//     dirty = true

//     setTimeout(() => {
//       if (dirty) {
//         save()
//         document.title = TITLE
//         dirty = false
//       }
//     }, 300)
//   }
// }

// textAreaElement.addEventListener("input", triggerAutoSave)

let statusTimeout
const setStatus = message => {
  const el = document.getElementById("status")
  el.textContent = message
  if (statusTimeout) clearTimeout(statusTimeout)
  statusTimeout = setTimeout(() => {
    statusTimeout = null
    el.textContent = ""
  }, 2000)
}

// init
{
  const textEl = document.getElementById("textarea")

  document.getElementById("load-button").addEventListener("click", () => {
    setStatus("loading...")
    !(async () => {
      try {
        const contents = await fetchContents()
        textEl.textContent = contents
        textEl.focus()
      } catch (err) {
        setStatus("ERROR")
        throw err
      }
    })()
  })

  document.getElementById("save-button").addEventListener("click", () => {
    const contents = textEl.value.trimEnd()
    console.log("contents", contents)
    if (contents === lastContents) {
      setStatus("no change")
      return
    }

    setStatus("saving...")
    !(async () => {
      try {
        await fetchUpload(contents)
        setStatus("saved")
      } catch (err) {
        setStatus("ERROR")
        throw err
      }
    })()
  })

  document.getElementById("settings-button").addEventListener("click", () => {
    for (const [name, value] of Object.entries(settings)) {
      const el = document.getElementsByName(name)[0]
      el.value = value
    }
    settingsDialogsEl.showModal()
  })

  document.getElementById("settings-close-button").addEventListener("click", () => {
    settingsDialogsEl.close()
  })

  const settingsFormEl = document.getElementById("settings-form")
  settingsFormEl.addEventListener("submit", ev => {
    ev.preventDefault()
    saveSettings()
    settingsDialogsEl.close()
    setStatus(computeSettingsSummary(settings))
  })

  setStatus(computeSettingsSummary(settings))
}
