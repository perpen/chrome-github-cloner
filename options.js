'use strict'

chrome.storage.sync.get('protocol', (data) => {
  const currentProtocol = data.protocol

  const protocols = ['ssh', 'https']
  protocols.forEach((protocol) => {
    const button = document.getElementById(protocol)

    button.checked = protocol === currentProtocol

    button.addEventListener('change', function () {
      chrome.storage.sync.set({ protocol: protocol }, function () {
        var status = document.getElementById('status')
        status.textContent = 'Saved'
        setTimeout(() => { status.textContent = '' }, 750)
      })
    })
  })
})

chrome.storage.sync.get('ideCommand', (data) => {
  const ideCommand = data.ideCommand
  const input = document.getElementById('ideCommand')
  input.value = ideCommand

  input.addEventListener('input', function () {
    const ideCommand = input.value
    chrome.storage.sync.set({ ideCommand: ideCommand }, function () {
      var status = document.getElementById('status')
      status.textContent = 'Saved'
      setTimeout(() => { status.textContent = '' }, 750)
    })
  })
})

chrome.storage.sync.get('codeLocation', (data) => {
  const codeLocation = data.codeLocation
  const input = document.getElementById('codeLocation')
  input.value = codeLocation

  input.addEventListener('input', function () {
    const codeLocation = input.value
    chrome.storage.sync.set({ codeLocation: codeLocation }, function () {
      var status = document.getElementById('status')
      status.textContent = 'Saved'
      setTimeout(() => { status.textContent = '' }, 750)
    })
  })
})
