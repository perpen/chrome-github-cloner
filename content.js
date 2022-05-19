'use strict'

const EXT = 'chrome-github-cloner'
const DEFAULT_LABEL = 'Local IDE'

const sendGitUrlToExtension = (buttonUpdater, urls) => {
  const port = chrome.runtime.connect({ name: 'hello' })

  port.postMessage(urls)

  port.onMessage.addListener((msg) => {
    // console.log('from background:', msg)

    const output = msg.output
    if (output) {
      console.log(EXT, 'host script output >', output)
    }

    const status = msg.status
    if (status) {
      console.log(EXT, 'status:', status)
      switch (status) {
        case 'stopped':
          buttonUpdater(DEFAULT_LABEL, true)
          break
        default:
          buttonUpdater(DEFAULT_LABEL + ': ' + status, false)
      }
    }
  })
}

const decorateGithub = () => {
  if (!document.location.href.match(new RegExp('.*/github\\.com/'))) {
    return false
  }

  const findUrl = function() {
    const clibpboardCopyElts = document.querySelectorAll('clipboard-copy')
    for (const elt of clibpboardCopyElts) {
      const val = elt.getAttribute('value')
      if (val.startsWith('git@')) return val
    }
    if (val == null) {
      console.log(`did not find expected element`)
    }
    return val
  }

  const createButton = function() {
    const templateParent = document.querySelector('a[data-ga-click="Repository, download zip, location:repo overview"]')
    if (templateParent == null) {
      console.error('cannot find template element to create our button')
      return null
    }
    const template = templateParent.parentNode
    const copy = template.cloneNode(true)
    const oldLabel = copy.querySelector('a').childNodes[2]
    copy.querySelector('a').href = '#'
    oldLabel.parentNode.removeChild(oldLabel)
    const newLabel = document.createElement('div')
    newLabel.textContent = DEFAULT_LABEL
    copy.querySelector('a').appendChild(newLabel)
    template.parentNode.append(copy)
    return newLabel
  }

  const githubMenu = document.querySelector('get-repo')
  if (githubMenu == null) {
    console.log('did not find github menu element')
    return false
  }

  const theButton = createButton()
  if (theButton == null) return false

  const buttonUpdater = (text, isEnabled) => {
    theButton.innerText = text
    if (isEnabled) {
      theButton.classList.remove('disabled')
    } else {
      theButton.classList.add('disabled')
    }
  }

  const clickListener = (event) => {
    event.preventDefault()
    event.stopPropagation()
//    if (theButton.classList.contains('my-disabled')) {
//      return
//    }

    const url = findUrl()
    const branch = 'master'
    theButton.classList.add('my-disabled')

    sendGitUrlToExtension(buttonUpdater, { url: url, branch: branch })
  }
  theButton.parentNode.addEventListener('click', clickListener)

  return true
}

const decoratePage = () => decorateGithub()

window.addEventListener('load', decoratePage)
