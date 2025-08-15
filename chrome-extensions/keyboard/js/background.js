importScripts("/js/welcome.js");

async function getStorageAsync() {
	return await chrome.storage.local.get(null);
}

function getCurrentTab(callback) {
	chrome.tabs.query({
		active: true,
	}, tabs => {
		if (tabs[0]) {
			callback(tabs[0]);
		}
	});
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	// DO NOT change this function into async,
	// It needs to return true before sending response in async
	let storage;

	(async () => {
		storage = await getStorageAsync();

		if (request.method == "getLocalStorage") {
			sendResponse({ data: storage[request.key] });
		}
		else if (request.method == "getSmallKeyboardCoords") {
			sendResponse({ smallKeyboard: storage["smallKeyboard"], smallKeyboardTop: storage["smallKeyboardTop"], smallKeyboardBottom: storage["smallKeyboardBottom"], smallKeyboardRight: storage["smallKeyboardRight"], smallKeyboardLeft: storage["smallKeyboardLeft"] });
		}
		else if (request.method == "loadKeyboardSettings") {
			sendResponse({
				openedFirstTime: storage["openedFirstTime"],
				capsLock: storage["capsLock"],
				smallKeyboard: storage["smallKeyboard"],
				touchEvents: storage["touchEvents"],
				keyboardLayout1: storage["keyboardLayout1"],
				urlButton: storage["urlButton"],
				keyboardEnabled: storage["keyboardEnabled"]
			});
		}
		else if (request.method == "initLoadKeyboardSettings") {
			sendResponse({
				hardwareAcceleration: storage["hardwareAcceleration"],
				zoomLevel: storage["zoomLevel"],
				autoTrigger: storage["autoTrigger"],
				repeatLetters: storage["repeatLetters"],
				intelligentScroll: storage["intelligentScroll"],
				autoTriggerLinks: storage["autoTriggerLinks"],
				autoTriggerAfter: storage["autoTriggerAfter"],
				refreshTime: storage["refreshTime"]
			});
		}
		else if (request.method == "setLocalStorage") {
			storage[request.key] = request.value;
			sendResponse({ data: "ok" });
		}
		else if (request.method == "openFromIframe") {
			getCurrentTab(function (tab) {
				chrome.tabs.sendMessage(tab.id, request);
			});
		}
		else if (request.method == "clickFromIframe") {
			getCurrentTab(function (tab) {
				chrome.tabs.sendMessage(tab.id, request);
			});
		}
		else if (request.method == "toogleKeyboard") {
			if (storage["keyboardEnabled"] != "false") {
				storage["keyboardEnabled"] = "false";
			} else {
				storage["keyboardEnabled"] = "true";
			}
			getCurrentTab(function (tab) {
				vkeyboard_loadPageIcon(storage, tab.id);
				if (storage["keyboardEnabled"] == "false") {
					chrome.tabs.sendMessage(tab.id, "closeKeyboard");
				} else {
					chrome.tabs.sendMessage(tab.id, "openKeyboard");
				}
			})
			sendResponse({ data: "ok" });
		}
		else if (request.method == "toogleKeyboardOn") {
			storage["keyboardEnabled"] = "true";
			getCurrentTab(function (tab) {
				vkeyboard_loadPageIcon(storage, tab.id);
				chrome.tabs.sendMessage(tab.id, "openKeyboard");
			})
			sendResponse({ data: "ok" });
		}
		else if (request.method == "toogleKeyboardDemand") {
			storage["keyboardEnabled"] = "demand";
			getCurrentTab(function (tab) {
				vkeyboard_loadPageIcon(storage, tab.id);
				chrome.tabs.sendMessage(tab.id, "openKeyboard");
			})
			sendResponse({ data: "ok" });
		}
		else if (request.method == "toogleKeyboardOff") {
			storage["keyboardEnabled"] = "false";
			getCurrentTab(function (tab) {
				vkeyboard_loadPageIcon(storage, tab.id);
				chrome.tabs.sendMessage(tab.id, "closeKeyboard");
			})
			sendResponse({ data: "ok" });
		}
		else if (request.method == "openUrlBar") {
			getCurrentTab(function (tab) {
				chrome.tabs.sendMessage(tab.id, "openUrlBar");
				sendResponse({ data: "ok" });
			});
		}
		else if (request.method == "createTab") {
			chrome.tabs.create({ url: request.url });
		}
		else {
			sendResponse({});
		}
	})().then(async () => {
		if (storage) {
			await chrome.storage.local.set(storage);
		}
	});



	return true;
});

function vkeyboard_loadPageIcon(storage, tabId) {
	if (storage["keyboardEnabled"] == "demand") {
		chrome.action.setIcon({ tabId: tabId, path: "/icon-128.png" }, function () { })
	} else if (storage["keyboardEnabled"] != "false") {
		chrome.action.setIcon({ tabId: tabId, path: "/icon-128.png" }, function () { })
	} else {
		chrome.action.setIcon({ tabId: tabId, path: "/icon-128.png" }, function () { })
	}
}

chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
	const storage = await getStorageAsync();

	if (storage["toogleKeyboard"] != "false") {
		vkeyboard_loadPageIcon(storage, tabId);
	} else {
		await chrome.storage.local.set({
			keyboardEnabled: true,
		});
	}
});
