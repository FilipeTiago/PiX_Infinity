class BackgroundPage {

    initialize() {
        document.getElementById("inject").addEventListener("click", () => this.onIconClicked());
    }

 

    async onIconClicked() {
        const tab = await this.getActiveTabAsync();
        if (!tab) {
            return;
        }
        
        const tabId = tab.id;
 
        chrome.scripting.executeScript({
            target: {
                tabId,
            },
            files: ["/js/inject.js"]
        })

    }
 

    getActiveTabAsync() {
        return new Promise(resolve => {
            chrome.tabs.query({
                active: true,
                currentWindow: true,
            }, tabs => resolve(tabs[0]));
        });
    }

 

}
new BackgroundPage().initialize();