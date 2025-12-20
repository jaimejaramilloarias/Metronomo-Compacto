const { app, BrowserWindow, Tray, nativeImage, screen } = require("electron");
const path = require("node:path");

let tray = null;
let panelWindow = null;
let isQuitting = false;

const WINDOW_WIDTH = 420;
const WINDOW_HEIGHT = 560;
const WINDOW_MARGIN = 8;

const getTrayIcon = () => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
      <path fill="black" d="M3.5 14.5h11a.75.75 0 0 0 .75-.75v-7A3.75 3.75 0 0 0 11.5 3h-5A3.75 3.75 0 0 0 2.75 6.75v7c0 .414.336.75.75.75Zm3-9.5h5a2.25 2.25 0 0 1 2.25 2.25V13h-9V7.25A2.25 2.25 0 0 1 6.5 5Zm1 1.5a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Zm0 3a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z"/>
    </svg>
  `;
  const image = nativeImage.createFromBuffer(Buffer.from(svg));
  image.setTemplateImage(true);
  return image;
};

const createPanelWindow = () => {
  panelWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: false,
    backgroundColor: "#0b0f16",
    hasShadow: true,
    titleBarStyle: "customButtonsOnHover",
    roundedCorners: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  panelWindow.setAlwaysOnTop(true, "pop-up-menu");
  panelWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  const indexPath = path.join(__dirname, "..", "dist", "index.html");
  panelWindow.loadFile(indexPath);

  panelWindow.on("blur", () => {
    if (panelWindow && !panelWindow.webContents.isDevToolsOpened()) {
      panelWindow.hide();
    }
  });

  panelWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      panelWindow.hide();
    }
  });
};

const positionPanelWindow = () => {
  if (!panelWindow || !tray) return;

  const windowBounds = panelWindow.getBounds();
  const trayBounds = tray.getBounds();
  const display = screen.getDisplayNearestPoint({
    x: trayBounds.x,
    y: trayBounds.y,
  });
  const workArea = display.workArea;

  let x = Math.round(
    trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2
  );
  let y = Math.round(trayBounds.y + trayBounds.height + WINDOW_MARGIN);

  if (x < workArea.x + WINDOW_MARGIN) {
    x = workArea.x + WINDOW_MARGIN;
  }

  if (x + windowBounds.width > workArea.x + workArea.width - WINDOW_MARGIN) {
    x = workArea.x + workArea.width - windowBounds.width - WINDOW_MARGIN;
  }

  if (y + windowBounds.height > workArea.y + workArea.height - WINDOW_MARGIN) {
    y = workArea.y + workArea.height - windowBounds.height - WINDOW_MARGIN;
  }

  if (y < workArea.y + WINDOW_MARGIN) {
    y = workArea.y + WINDOW_MARGIN;
  }

  panelWindow.setPosition(x, y, false);
};

const togglePanelWindow = () => {
  if (!panelWindow) return;

  if (panelWindow.isVisible()) {
    panelWindow.hide();
    return;
  }

  positionPanelWindow();
  panelWindow.show();
  panelWindow.focus();
};

const createTray = () => {
  tray = new Tray(getTrayIcon());
  tray.setToolTip("Metronomo");
  tray.on("click", togglePanelWindow);
  tray.on("right-click", togglePanelWindow);
};

app.on("before-quit", () => {
  isQuitting = true;
});

app.whenReady().then(() => {
  if (app.dock) {
    app.dock.hide();
  }
  createPanelWindow();
  createTray();
});

app.on("activate", () => {
  if (!panelWindow) {
    createPanelWindow();
  }
});

app.on("window-all-closed", (event) => {
  event.preventDefault();
});
