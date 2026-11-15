// Where TrabahoCheck is running. Change this to your deployed URL later.
const APP_URL = 'http://localhost:5173'

const MAX_CHARS = 12000

document.getElementById('go').addEventListener('click', async () => {
  const status = document.getElementById('status')
  status.textContent = ''

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const selected = String(window.getSelection() || '').trim()
        const body = selected.length > 80 ? selected : document.body.innerText
        return `${document.title}\n${location.href}\n\n${body}`
      },
    })

    const text = String(result || '').slice(0, MAX_CHARS)
    if (text.trim().length < 80) {
      status.textContent = 'Could not read this page. Select the job text and try again.'
      return
    }

    await chrome.tabs.create({ url: `${APP_URL}/#text=${encodeURIComponent(text)}` })
    window.close()
  } catch {
    status.textContent = 'This page cannot be read (browser pages are protected).'
  }
})
