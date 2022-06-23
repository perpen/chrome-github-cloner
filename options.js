'use strict'

chrome.storage.sync.get('protocol', (data) => {
  const currentProtocol = data.protocol

  const protocols = ['ssh', 'https']
  protocols.forEach((protocol) => {
    return //FIXME
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
