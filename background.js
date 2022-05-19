'use strict'

// port to native host process
var nativePort = null
// associates a git url to the port to the corresponding page
var contentPorts = {}

const connect = () => {
  if (!nativePort) {
    var hostName = 'org.hfdom.chrome_github_cloner'
    console.log('connecting to native messaging host:', hostName)
    nativePort = chrome.runtime.connectNative(hostName)
    nativePort.onMessage.addListener(onNativeMessage)
    nativePort.onDisconnect.addListener(onDisconnected)
  }
}

// Message can be an object
const sendNativeMessage = (msg) => {
  connect()
  nativePort.postMessage(msg)
  console.log('to host:', msg)
}

const onNativeMessage = (msg) => {
  console.log('from host:', msg)
  const contentPort = contentPorts[msg.target]
  if (contentPort) {
    contentPort.postMessage(msg.data)
  } else {
    console.error(`no contentPort for ${msg.target}`)
  }
}

const onDisconnected = () => {
  console.log('disconnected from host: ' + chrome.runtime.lastError.message)
  nativePort = null
}

chrome.runtime.onConnect.addListener((contentPort) => {
  // console.log('from sender:', contentPort.sender)
  console.assert(contentPort.name === 'hello')

  contentPort.onMessage.addListener(function (msg) {
    console.log('from content:', msg)
    const url = msg['url']
    contentPorts[url] = contentPort
    chrome.storage.sync.get('ideCommand', (data) => {
      const ideCommand = data.ideCommand
      chrome.storage.sync.get('codeLocation', (data) => {
        const codeLocation = data.codeLocation
        sendNativeMessage({ url: url, ideCommand: ideCommand, codeLocation: codeLocation })
      })
    })
  })
})

chrome.runtime.onInstalled.addListener(function () {
  const defaultOptions = {
    ideCommand: 'tmux2 chrome-github-cloner "%s"',
    codeLocation: '%s/src'
  }
  chrome.storage.sync.set(defaultOptions, function () {
    console.log('default options set')
  })
})
