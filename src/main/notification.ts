import { Notification } from 'electron'

interface NotificationOptions {
  title: string
  body: string
}

export function sendNotification({ title, body }: NotificationOptions) {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      silent: false,
    })
    notification.on('click', () => {
      // Focus the main window on notification click
      const { BrowserWindow } = require('electron')
      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        windows[0].focus()
      }
    })
    notification.show()
  }
}
